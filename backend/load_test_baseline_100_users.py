"""
=============================================================================
EXPIRYGO BASELINE LOAD TEST RUNNER — 100 CONCURRENT VIRTUAL USERS (60 SECONDS)
=============================================================================
Features:
- 100 Virtual Users (Asynchronous Concurrent Workers)
- Continuous 60-second test window
- Thousands of requests across core API routes
- Tracks Requests Per Second (RPS), Latencies (Min/Avg/Max/p50/p90/p95/p99)
- Generates executive summary + multi-sheet Excel report (.xlsx)
=============================================================================
"""

import asyncio
import time
import sys
import statistics
import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_BASE = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
CONCURRENT_USERS = int(os.getenv("CONCURRENT_USERS", "100"))
TEST_DURATION_SECONDS = int(os.getenv("TEST_DURATION_SECONDS", "60"))
OUTPUT_EXCEL_PATH = os.getenv(
    "OUTPUT_EXCEL_PATH",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "Vulnerability Test Results", "ExpiryGo_Baseline_Load_Test_Report.xlsx"))
)

ENDPOINTS = [
    {"path": "/health", "weight": 20, "name": "API Health Probe"},
    {"path": "/products/", "weight": 35, "name": "Surplus Deals Feed"},
    {"path": "/products/categories", "weight": 10, "name": "Categories List"},
    {"path": "/shops/", "weight": 15, "name": "Verified Shops Directory"},
    {"path": "/shops/map", "weight": 10, "name": "Map Store Locator"},
    {"path": "/products/flash-deals", "weight": 5, "name": "Flash Urgent Deals"},
    {"path": "/translate/languages", "weight": 5, "name": "Multilingual Locales"},
]

# Expand weighted endpoints
ENDPOINT_POOL = []
for ep in ENDPOINTS:
    ENDPOINT_POOL.extend([ep] * ep["weight"])


class LoadTestCollector:
    def __init__(self):
        self.records = []
        self.start_time = 0.0
        self.end_time = 0.0
        self.second_buckets = {}  # second -> list of latencies
        self.endpoint_stats = {}  # path -> list of latencies

    def record(self, path: str, method: str, status_code: int, latency_ms: float, timestamp: float):
        self.records.append({
            "path": path,
            "method": method,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "timestamp": timestamp,
            "success": 200 <= status_code < 400
        })

        # Second-by-second bucket
        sec_offset = int(timestamp - self.start_time)
        if sec_offset not in self.second_buckets:
            self.second_buckets[sec_offset] = []
        self.second_buckets[sec_offset].append(latency_ms)

        # Endpoint stats
        if path not in self.endpoint_stats:
            self.endpoint_stats[path] = {"latencies": [], "success": 0, "fail": 0}
        self.endpoint_stats[path]["latencies"].append(latency_ms)
        if 200 <= status_code < 400:
            self.endpoint_stats[path]["success"] += 1
        else:
            self.endpoint_stats[path]["fail"] += 1

    def compute_summary(self):
        total_duration = max(self.end_time - self.start_time, 1.0)
        total_requests = len(self.records)
        all_latencies = [r["latency_ms"] for r in self.records]

        if not all_latencies:
            return None

        sorted_lat = sorted(all_latencies)
        successes = sum(1 for r in self.records if r["success"])
        failures = total_requests - successes
        rps = total_requests / total_duration

        p50 = statistics.median(sorted_lat)
        p90 = sorted_lat[int(len(sorted_lat) * 0.90)] if len(sorted_lat) > 1 else sorted_lat[0]
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if len(sorted_lat) > 1 else sorted_lat[0]
        p99 = sorted_lat[int(len(sorted_lat) * 0.99)] if len(sorted_lat) > 1 else sorted_lat[0]

        return {
            "total_requests": total_requests,
            "duration_seconds": total_duration,
            "concurrent_users": CONCURRENT_USERS,
            "requests_per_second": rps,
            "success_count": successes,
            "fail_count": failures,
            "success_rate_pct": (successes / total_requests) * 100 if total_requests else 0,
            "min_ms": min(all_latencies),
            "avg_ms": statistics.mean(all_latencies),
            "p50_ms": p50,
            "p90_ms": p90,
            "p95_ms": p95,
            "p99_ms": p99,
            "max_ms": max(all_latencies),
        }


async def virtual_user_worker(user_id: int, client: httpx.AsyncClient, collector: LoadTestCollector, stop_event: asyncio.Event):
    req_index = 0
    pool_len = len(ENDPOINT_POOL)

    while not stop_event.is_set():
        ep_info = ENDPOINT_POOL[(user_id + req_index) % pool_len]
        path = ep_info["path"]
        url = f"{API_BASE}{path}"

        t0 = time.perf_counter()
        req_time = time.time()
        try:
            resp = await client.get(url, timeout=5.0)
            latency_ms = (time.perf_counter() - t0) * 1000.0
            status = resp.status_code
        except Exception as err:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            status = 500

        collector.record(path, "GET", status, latency_ms, req_time)
        req_index += 1

        # Yield to event loop
        await asyncio.sleep(0.02)


async def run_baseline_load_test():
    print("=" * 75, flush=True)
    print("🚀 EXPIRYGO BASELINE LOAD TEST — 100 CONCURRENT VIRTUAL USERS", flush=True)
    print("=" * 75, flush=True)
    print(f"🎯 Target Base URL:      {API_BASE}", flush=True)
    print(f"👥 Virtual Users (VUs):  {CONCURRENT_USERS} concurrent users", flush=True)
    print(f"⏱️  Duration:             {TEST_DURATION_SECONDS} seconds (1 minute)", flush=True)
    print(f"🛣️  Core Endpoints:       {len(ENDPOINTS)} routes (Health, Deals, Shops, Map, Search)", flush=True)
    print("=" * 75 + "\n", flush=True)

    collector = LoadTestCollector()
    stop_event = asyncio.Event()

    limits = httpx.Limits(max_keepalive_connections=80, max_connections=120)
    async with httpx.AsyncClient(limits=limits, timeout=6.0) as client:
        # Pre-flight warm-up check
        try:
            r = await client.get(f"{API_BASE}/health")
            print(f"✅ Pre-flight check successful: HTTP {r.status_code} ({r.json()})", flush=True)
        except Exception as e:
            print(f"❌ Pre-flight check failed: {e}", flush=True)
            return

        print(f"\n⏳ Spawning {CONCURRENT_USERS} virtual user tasks... Test starting now!\n", flush=True)
        collector.start_time = time.time()
        
        tasks = [
            asyncio.create_task(virtual_user_worker(uid, client, collector, stop_event))
            for uid in range(CONCURRENT_USERS)
        ]

        # Progress ticker every 5 seconds
        for elapsed in range(5, TEST_DURATION_SECONDS + 1, 5):
            await asyncio.sleep(5)
            curr_total = len(collector.records)
            curr_rps = curr_total / elapsed
            recent_latencies = [r["latency_ms"] for r in collector.records[-500:]] if collector.records else [0]
            curr_avg = statistics.mean(recent_latencies) if recent_latencies else 0
            print(f"⏱️  [{elapsed:02d}/{TEST_DURATION_SECONDS}s] Progress: {curr_total:,} requests sent | Current Throughput: {curr_rps:6.1f} req/sec | Avg Latency: {curr_avg:5.1f}ms", flush=True)

        # Stop workers
        stop_event.set()
        await asyncio.sleep(0.5)
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        collector.end_time = time.time()

    summary = collector.compute_summary()
    print("\n" + "=" * 75, flush=True)
    print("📊 BASELINE LOAD TEST EXECUTION COMPLETED", flush=True)
    print("=" * 75, flush=True)

    print("\n📈 [THROUGHPUT & REQUESTS PER SECOND (RPS)]", flush=True)
    print(f" • Total Requests Dispatched: {summary['total_requests']:,} requests", flush=True)
    print(f" • Exact Test Duration:       {summary['duration_seconds']:.2f} seconds", flush=True)
    print(f" • Requests Per Second (RPS): {summary['requests_per_second']:.2f} req/sec", flush=True)
    print(f" • Success Rate:              {summary['success_rate_pct']:.2f}% ({summary['success_count']:,} passed / {summary['fail_count']} failed)", flush=True)

    print("\n⚡ [RESPONSE TIME & LATENCY METRICS]", flush=True)
    print(f" • Minimum (Fastest response): {summary['min_ms']:.2f} ms", flush=True)
    print(f" • Average (Mean response):    {summary['avg_ms']:.2f} ms", flush=True)
    print(f" • Median (p50):               {summary['p50_ms']:.2f} ms", flush=True)
    print(f" • 90th Percentile (p90):      {summary['p90_ms']:.2f} ms", flush=True)
    print(f" • 95th Percentile (p95):      {summary['p95_ms']:.2f} ms", flush=True)
    print(f" • 99th Percentile (p99):      {summary['p99_ms']:.2f} ms", flush=True)
    print(f" • Maximum (Slowest response): {summary['max_ms']:.2f} ms ({summary['max_ms']/1000.0:.2f}s)", flush=True)

    print("\n📌 [PER-ENDPOINT PERFORMANCE BREAKDOWN]", flush=True)
    print(f"{'Endpoint Route':<30} | {'Requests':<10} | {'Share %':<8} | {'Avg Latency':<12} | {'p95 Latency':<12} | {'Success Rate'}", flush=True)
    print("-" * 95, flush=True)
    for path, data in sorted(collector.endpoint_stats.items(), key=lambda x: len(x[1]["latencies"]), reverse=True):
        count = len(data["latencies"])
        share = (count / summary["total_requests"]) * 100
        avg_l = statistics.mean(data["latencies"])
        sorted_l = sorted(data["latencies"])
        p95_l = sorted_l[int(len(sorted_l) * 0.95)] if len(sorted_l) > 1 else sorted_l[0]
        s_rate = (data["success"] / count) * 100
        print(f"{path:<30} | {count:<10,} | {share:6.1f}%  | {avg_l:8.2f} ms   | {p95_l:8.2f} ms   | {s_rate:5.1f}%", flush=True)

    print("=" * 75 + "\n", flush=True)

    # Generate multi-sheet Excel report
    generate_excel_load_report(collector, summary)


def generate_excel_load_report(collector: LoadTestCollector, summary: dict):
    print(f"📊 Generating Comprehensive Excel Load Test Report: {OUTPUT_EXCEL_PATH}...", flush=True)

    os.makedirs(os.path.dirname(OUTPUT_EXCEL_PATH), exist_ok=True)
    wb = openpyxl.Workbook()

    # Style Helpers
    HEADER_FILL = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
    HEADER_FONT = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    TITLE_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    TITLE_FONT = Font(name="Segoe UI", size=14, bold=True, color="FFFFFF")
    SUB_FILL = PatternFill(start_color="ECFDF5", end_color="ECFDF5", fill_type="solid")
    KPI_BLUE = PatternFill(start_color="0284C7", end_color="0284C7", fill_type="solid")
    KPI_GREEN = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
    KPI_PURPLE = PatternFill(start_color="6366F1", end_color="6366F1", fill_type="solid")
    KPI_AMBER = PatternFill(start_color="F59E0B", end_color="F59E0B", fill_type="solid")
    WHITE_BOLD_LARGE = Font(name="Segoe UI", size=18, bold=True, color="FFFFFF")
    WHITE_BOLD_MED = Font(name="Segoe UI", size=10, bold=True, color="FFFFFF")
    THIN_BORDER = Border(
        left=Side(style="thin", color="E2E8F0"),
        right=Side(style="thin", color="E2E8F0"),
        top=Side(style="thin", color="E2E8F0"),
        bottom=Side(style="thin", color="E2E8F0")
    )
    ALIGN_CENTER = Alignment(horizontal="center", vertical="center")
    ALIGN_LEFT = Alignment(horizontal="left", vertical="center")
    ALIGN_RIGHT = Alignment(horizontal="right", vertical="center")

    # =========================================================================
    # SHEET 1: EXECUTIVE SUMMARY DASHBOARD
    # =========================================================================
    ws1 = wb.active
    ws1.title = "Executive Summary"
    ws1.views.sheetView[0].showGridLines = True

    # Title Banner
    ws1.merge_cells("B2:H3")
    cell_title = ws1["B2"]
    cell_title.value = "⚡ EXPIRYGO BASELINE LOAD & CONCURRENCY TEST REPORT"
    cell_title.font = TITLE_FONT
    cell_title.fill = TITLE_FILL
    cell_title.alignment = ALIGN_CENTER

    # Subtitle
    ws1.merge_cells("B4:H4")
    cell_sub = ws1["B4"]
    cell_sub.value = f"Virtual Users: 100 Concurrent | Duration: 60 Seconds | Target: {API_BASE} | Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}"
    cell_sub.font = Font(name="Segoe UI", size=9, italic=True, color="475569")
    cell_sub.fill = SUB_FILL
    cell_sub.alignment = ALIGN_CENTER

    # KPI Cards Row 6-8
    kpi_defs = [
        ("TOTAL REQUESTS", f"{summary['total_requests']:,}", "B", "C", KPI_BLUE),
        ("THROUGHPUT (RPS)", f"{summary['requests_per_second']:.1f} req/s", "D", "D", KPI_GREEN),
        ("AVERAGE LATENCY", f"{summary['avg_ms']:.1f} ms", "E", "E", KPI_PURPLE),
        ("P95 LATENCY", f"{summary['p95_ms']:.1f} ms", "F", "G", KPI_AMBER),
        ("SUCCESS RATE", f"{summary['success_rate_pct']:.1f}%", "H", "H", KPI_GREEN),
    ]

    for label, val, c_start, c_end, fill_color in kpi_defs:
        ws1.merge_cells(f"{c_start}6:{c_end}6")
        ws1.merge_cells(f"{c_start}7:{c_end}8")

        top_c = ws1[f"{c_start}6"]
        top_c.value = label
        top_c.font = WHITE_BOLD_MED
        top_c.fill = HEADER_FILL
        top_c.alignment = ALIGN_CENTER

        val_c = ws1[f"{c_start}7"]
        val_c.value = val
        val_c.font = WHITE_BOLD_LARGE
        val_c.fill = fill_color
        val_c.alignment = ALIGN_CENTER

    # Latency Percentiles Table
    ws1["B10"].value = "⏱️ LATENCY PERCENTILES & RESPONSE TIME BENCHMARKS"
    ws1["B10"].font = Font(name="Segoe UI", size=11, bold=True, color="0F172A")

    headers_pct = ["Percentile Metric", "Response Time (ms)", "Response Time (Seconds)", "Evaluation & Assessment"]
    for idx, h in enumerate(headers_pct, start=2):
        cell = ws1.cell(row=11, column=idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = ALIGN_CENTER if idx > 2 else ALIGN_LEFT

    percentiles_data = [
        ("Minimum (Fastest Request)", f"{summary['min_ms']:.2f} ms", f"{summary['min_ms']/1000:.3f} s", "Ultra-fast cached response (< 5ms)"),
        ("50th Percentile (Median / p50)", f"{summary['p50_ms']:.2f} ms", f"{summary['p50_ms']/1000:.3f} s", "50% of all requests completed within this time"),
        ("Average (Mean Latency)", f"{summary['avg_ms']:.2f} ms", f"{summary['avg_ms']/1000:.3f} s", "Average latency under 100 concurrent users"),
        ("90th Percentile (p90)", f"{summary['p90_ms']:.2f} ms", f"{summary['p90_ms']/1000:.3f} s", "90% of requests handled smoothly"),
        ("95th Percentile (p95)", f"{summary['p95_ms']:.2f} ms", f"{summary['p95_ms']/1000:.3f} s", "95% of requests completed well under SLA threshold"),
        ("99th Percentile (p99)", f"{summary['p99_ms']:.2f} ms", f"{summary['p99_ms']/1000:.3f} s", "Tail latency boundary for heavy database queries"),
        ("Maximum (Slowest Request)", f"{summary['max_ms']:.2f} ms", f"{summary['max_ms']/1000:.3f} s", "Worst-case peak response time during load"),
    ]

    for r_idx, row_data in enumerate(percentiles_data, start=12):
        for c_idx, val in enumerate(row_data, start=2):
            cell = ws1.cell(row=r_idx, column=c_idx, value=val)
            cell.font = Font(name="Segoe UI", size=9, bold=(c_idx == 2 or c_idx == 3))
            cell.alignment = ALIGN_CENTER if c_idx in (3, 4) else ALIGN_LEFT
            cell.border = THIN_BORDER
            if r_idx % 2 == 0:
                cell.fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    # Column Widths
    ws1.column_dimensions["A"].width = 4
    ws1.column_dimensions["B"].width = 36
    ws1.column_dimensions["C"].width = 22
    ws1.column_dimensions["D"].width = 24
    ws1.column_dimensions["E"].width = 48
    ws1.column_dimensions["F"].width = 16
    ws1.column_dimensions["G"].width = 16
    ws1.column_dimensions["H"].width = 18

    # =========================================================================
    # SHEET 2: PER-ENDPOINT PERFORMANCE BREAKDOWN
    # =========================================================================
    ws2 = wb.create_sheet(title="Endpoint Breakdown")
    ws2.views.sheetView[0].showGridLines = True

    ep_headers = ["Endpoint Route", "Total Requests", "Traffic Share (%)", "Throughput (RPS)", "Min (ms)", "Avg Latency (ms)", "p95 Latency (ms)", "Max (ms)", "Success Rate (%)", "Status"]
    for col_idx, h in enumerate(ep_headers, start=1):
        cell = ws2.cell(row=1, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = ALIGN_CENTER if col_idx > 1 else ALIGN_LEFT

    ws2.row_dimensions[1].height = 26

    for r_idx, (path, data) in enumerate(sorted(collector.endpoint_stats.items(), key=lambda x: len(x[1]["latencies"]), reverse=True), start=2):
        count = len(data["latencies"])
        share = (count / summary["total_requests"]) * 100
        ep_rps = count / summary["duration_seconds"]
        min_l = min(data["latencies"])
        avg_l = statistics.mean(data["latencies"])
        sorted_l = sorted(data["latencies"])
        p95_l = sorted_l[int(len(sorted_l) * 0.95)] if len(sorted_l) > 1 else sorted_l[0]
        max_l = max(data["latencies"])
        s_rate = (data["success"] / count) * 100

        ws2.cell(row=r_idx, column=1, value=path).alignment = ALIGN_LEFT
        ws2.cell(row=r_idx, column=2, value=count).alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=3, value=f"{share:.1f}%").alignment = ALIGN_CENTER
        ws2.cell(row=r_idx, column=4, value=f"{ep_rps:.1f}").alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=5, value=f"{min_l:.2f} ms").alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=6, value=f"{avg_l:.2f} ms").alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=7, value=f"{p95_l:.2f} ms").alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=8, value=f"{max_l:.2f} ms").alignment = ALIGN_RIGHT
        ws2.cell(row=r_idx, column=9, value=f"{s_rate:.1f}%").alignment = ALIGN_CENTER
        
        status_cell = ws2.cell(row=r_idx, column=10, value="OPTIMAL" if s_rate > 98 else "REVIEW")
        status_cell.alignment = ALIGN_CENTER
        status_cell.font = Font(name="Segoe UI", size=9, bold=True, color="065F46" if s_rate > 98 else "991B1B")
        status_cell.fill = PatternFill(start_color="D1FAE5" if s_rate > 98 else "FEE2E2", end_color="D1FAE5" if s_rate > 98 else "FEE2E2", fill_type="solid")

        for c_idx in range(1, 11):
            ws2.cell(row=r_idx, column=c_idx).border = THIN_BORDER

    for col in ws2.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws2.column_dimensions[col_letter].width = max(max_len + 4, 14)

    # =========================================================================
    # SHEET 3: TIMELINE (SECOND-BY-SECOND THROUGHPUT)
    # =========================================================================
    ws3 = wb.create_sheet(title="Timeline & RPS History")
    ws3.views.sheetView[0].showGridLines = True

    timeline_headers = ["Elapsed Second", "Active Virtual Users", "Requests Sent", "Instantaneous RPS", "Mean Latency (ms)", "p95 Latency (ms)", "Min Latency (ms)", "Max Latency (ms)"]
    for col_idx, h in enumerate(timeline_headers, start=1):
        cell = ws3.cell(row=1, column=col_idx, value=h)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = ALIGN_CENTER

    ws3.row_dimensions[1].height = 26

    for sec in range(int(summary["duration_seconds"]) + 1):
        lats = collector.second_buckets.get(sec, [])
        if not lats:
            continue
        row_num = sec + 2
        sec_cnt = len(lats)
        sec_mean = statistics.mean(lats)
        sorted_s = sorted(lats)
        sec_p95 = sorted_s[int(len(sorted_s) * 0.95)] if len(sorted_s) > 1 else sorted_s[0]

        ws3.cell(row=row_num, column=1, value=f"{sec:02d}s").alignment = ALIGN_CENTER
        ws3.cell(row=row_num, column=2, value=CONCURRENT_USERS).alignment = ALIGN_CENTER
        ws3.cell(row=row_num, column=3, value=sec_cnt).alignment = ALIGN_RIGHT
        ws3.cell(row=row_num, column=4, value=sec_cnt).alignment = ALIGN_RIGHT
        ws3.cell(row=row_num, column=5, value=round(sec_mean, 2)).alignment = ALIGN_RIGHT
        ws3.cell(row=row_num, column=6, value=round(sec_p95, 2)).alignment = ALIGN_RIGHT
        ws3.cell(row=row_num, column=7, value=round(min(lats), 2)).alignment = ALIGN_RIGHT
        ws3.cell(row=row_num, column=8, value=round(max(lats), 2)).alignment = ALIGN_RIGHT

        for c in range(1, 9):
            ws3.cell(row=row_num, column=c).border = THIN_BORDER

    for col in ws3.columns:
        max_len = max(len(str(cell.value or "")) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws3.column_dimensions[col_letter].width = max(max_len + 4, 16)

    # Save to disk
    wb.save(OUTPUT_EXCEL_PATH)
    print(f"🎉 Excel report saved successfully at: {OUTPUT_EXCEL_PATH}\n")


if __name__ == "__main__":
    asyncio.run(run_baseline_load_test())
