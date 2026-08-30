import asyncio
import time
import uuid
import sys
import statistics
import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

API_BASE = "http://127.0.0.1:8000"

class LoadTestReport:
    def __init__(self):
        self.latencies = []
        self.success_count = 0
        self.fail_count = 0
        self.db_errors = 0
        self.race_condition_errors = 0
        self.security_checks_passed = 0
        self.security_checks_failed = 0
        self.errors = []
        self.status_codes = {}

    def record(self, latency_ms: float, success: bool, status_code: int, err_msg: str = ""):
        self.latencies.append(latency_ms)
        self.status_codes[status_code] = self.status_codes.get(status_code, 0) + 1
        if success:
            self.success_count += 1
        else:
            self.fail_count += 1
            if "database" in err_msg.lower() or "timeout" in err_msg.lower() or "queuepool" in err_msg.lower():
                self.db_errors += 1
            if err_msg:
                self.errors.append(f"[{status_code}] {err_msg[:120]}")

    def summary(self) -> dict:
        if not self.latencies:
            return {"total": 0}
        sorted_lat = sorted(self.latencies)
        p50 = statistics.median(sorted_lat)
        p90 = sorted_lat[int(len(sorted_lat) * 0.90)] if len(sorted_lat) > 1 else sorted_lat[0]
        p95 = sorted_lat[int(len(sorted_lat) * 0.95)] if len(sorted_lat) > 1 else sorted_lat[0]
        p99 = sorted_lat[int(len(sorted_lat) * 0.99)] if len(sorted_lat) > 1 else sorted_lat[0]
        return {
            "total_requests": len(self.latencies),
            "success": self.success_count,
            "failed": self.fail_count,
            "success_rate_pct": round((self.success_count / len(self.latencies)) * 100, 2),
            "db_connection_errors": self.db_errors,
            "race_condition_errors": self.race_condition_errors,
            "security_checks_passed": self.security_checks_passed,
            "security_checks_failed": self.security_checks_failed,
            "min_ms": round(min(self.latencies), 2),
            "mean_ms": round(statistics.mean(self.latencies), 2),
            "p50_ms": round(p50, 2),
            "p90_ms": round(p90, 2),
            "p95_ms": round(p95, 2),
            "p99_ms": round(p99, 2),
            "max_ms": round(max(self.latencies), 2),
            "status_distribution": self.status_codes,
            "sample_errors": self.errors[:5]
        }


async def run_customer_session(client: httpx.AsyncClient, cust_data: dict, target_product_ids: list[str], report: LoadTestReport, iterations: int = 5):
    headers = {"Authorization": f"Bearer {cust_data['token']}"}
    user_id = cust_data["user"]["id"]

    for it in range(iterations):
        # 1. Browse deals feed
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/products/?hide_expired=true", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 2. Deep semantic & category search
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/products/search/deep?q=organic&category=PRODUCE&radius_km=50", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 3. View individual product
        if target_product_ids:
            pid = target_product_ids[(cust_data["idx"] + it) % len(target_product_ids)]
            t0 = time.perf_counter()
            try:
                r = await client.get(f"{API_BASE}/products/{pid}", headers=headers, timeout=20.0)
                dur = (time.perf_counter() - t0) * 1000
                report.record(dur, r.status_code in (200, 404), r.status_code, r.text if r.status_code not in (200, 404) else "")
            except Exception as e:
                dur = (time.perf_counter() - t0) * 1000
                report.record(dur, False, 500, str(e))

            # 4. Attempt concurrent reservation on product (Row-level lock & stock deduction test)
            t0 = time.perf_counter()
            try:
                r = await client.post(f"{API_BASE}/reservations/", json={
                    "product_id": pid,
                    "quantity": 1
                }, headers=headers, timeout=20.0)
                dur = (time.perf_counter() - t0) * 1000
                # 201 Created is successful reservation; 400 is expected when limited stock runs out!
                is_valid = r.status_code in (201, 400)
                report.record(dur, is_valid, r.status_code, r.text if not is_valid else "")
            except Exception as e:
                dur = (time.perf_counter() - t0) * 1000
                report.record(dur, False, 500, str(e))

        # 5. Check personal reservation history
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/reservations/me", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 6. Check personal order history
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/orders/me", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 7. Check user profile
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/users/me", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # Small pacing between iterations
        await asyncio.sleep(0.05)


async def run_merchant_session(client: httpx.AsyncClient, merchant_data: dict, report: LoadTestReport, iterations: int = 5):
    headers = {"Authorization": f"Bearer {merchant_data['token']}"}
    shop_id = merchant_data["shop"]["id"]
    m_idx = merchant_data["idx"]

    for it in range(iterations):
        # 1. Check shop analytics
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/shops/me/analytics", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 2. Check AI inventory forecast
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/shops/me/analytics/ai-inventory", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 3. Check incoming shop reservations
        t0 = time.perf_counter()
        try:
            r = await client.get(f"{API_BASE}/shops/me/reservations", headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 200, r.status_code, r.text if r.status_code != 200 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        # 4. Add dynamic deal item
        t0 = time.perf_counter()
        try:
            r = await client.post(f"{API_BASE}/products/", json={
                "shop_id": shop_id,
                "name": f"Fresh Farm Produce {m_idx}-{it}",
                "category": "PRODUCE",
                "original_price": 100.0,
                "discount_price": 40.0,
                "quantity": 20,
                "manufacturing_date": "2026-08-20T08:00:00",
                "expiry_date": "2026-08-30T08:00:00",
                "description": "Crisp fresh produce item added during merchant session.",
                "front_image_url": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400",
                "is_active": True
            }, headers=headers, timeout=20.0)
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, r.status_code == 201, r.status_code, r.text if r.status_code != 201 else "")
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))

        await asyncio.sleep(0.05)


async def run_security_authorization_checks(client: httpx.AsyncClient, customers: list[dict], merchants: list[dict], target_pids: list[str], report: LoadTestReport):
    print("\n[Security Verification] Executing strict authorization & tenant isolation checks...")
    
    cust_token = customers[0]["token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    
    merchant_a_token = merchants[0]["token"]
    merchant_a_headers = {"Authorization": f"Bearer {merchant_a_token}"}
    
    merchant_b_token = merchants[1]["token"]
    merchant_b_headers = {"Authorization": f"Bearer {merchant_b_token}"}
    
    # 1. Customer attempting to access merchant dashboard / analytics (Expect 403 Forbidden)
    r1 = await client.get(f"{API_BASE}/shops/me/analytics", headers=cust_headers)
    if r1.status_code == 403:
        report.security_checks_passed += 1
        print("  ✓ Security Check 1 Passed: Customer forbidden from merchant analytics (403)")
    else:
        report.security_checks_failed += 1
        print(f"  ❌ Security Check 1 Failed: Expected 403, got {r1.status_code}")

    # 2. Customer attempting to create product (Expect 403 Forbidden)
    r2 = await client.post(f"{API_BASE}/products/", json={"name": "Hacked Product", "original_price": 50, "quantity": 10, "category": "OTHER", "manufacturing_date": "2026-08-20T00:00:00", "expiry_date": "2026-08-30T00:00:00"}, headers=cust_headers)
    if r2.status_code == 403:
        report.security_checks_passed += 1
        print("  ✓ Security Check 2 Passed: Customer forbidden from creating products (403)")
    else:
        report.security_checks_failed += 1
        print(f"  ❌ Security Check 2 Failed: Expected 403, got {r2.status_code}")

    # 3. Merchant A creating a product, Merchant B attempting to delete it (Expect 404/403 Cross-Shop isolation)
    r_prod = await client.post(f"{API_BASE}/products/", json={
        "shop_id": merchants[0]["shop"]["id"],
        "name": "Isolated Product Merchant A",
        "category": "DAIRY",
        "original_price": 80.0,
        "discount_price": 40.0,
        "quantity": 5,
        "manufacturing_date": "2026-08-20T00:00:00",
        "expiry_date": "2026-08-30T00:00:00"
    }, headers=merchant_a_headers)
    
    if r_prod.status_code == 201:
        prod_id = r_prod.json()["id"]
        # Merchant B tries to delete Merchant A's product
        r3 = await client.delete(f"{API_BASE}/products/{prod_id}", headers=merchant_b_headers)
        if r3.status_code in (403, 404):
            report.security_checks_passed += 1
            print("  ✓ Security Check 3 Passed: Merchant B cannot delete Merchant A product (404/403)")
        else:
            report.security_checks_failed += 1
            print(f"  ❌ Security Check 3 Failed: Cross-shop modification allowed! Status: {r3.status_code}")


async def main():
    print("=" * 75)
    print("🚀 EXPIRYGO PRODUCTION SUSTAINED LOAD & INTEGRITY VALIDATION")
    print("=" * 75)

    report = LoadTestReport()
    limits = httpx.Limits(max_connections=300, max_keepalive_connections=150)
    timeout = httpx.Timeout(30.0, connect=10.0)

    async with httpx.AsyncClient(limits=limits, timeout=timeout) as client:
        # Step 1: Initialize 10 Real Merchants with stores and initial inventory
        print("\n[Step 1] Initializing 10 Real Merchant Accounts & Partner Stores...")
        merchants = []
        target_product_ids = []
        for i in range(10):
            email = f"merchant_{uuid.uuid4().hex[:8]}@production-test.com"
            r = await client.post(f"{API_BASE}/auth/register", json={
                "email": email,
                "password": "ProductionPassword123!",
                "name": f"Organic Mart {i+1}",
                "is_shop_owner": True,
                "phone_number": f"+91980{i:07d}"
            })
            token = r.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            shop_r = await client.get(f"{API_BASE}/shops/me", headers=headers)
            shop = shop_r.json()
            
            # Create 2 initial products per store (1 with limited stock 25 for race testing, 1 with stock 200)
            p1 = await client.post(f"{API_BASE}/products/", json={
                "shop_id": shop["id"],
                "name": f"High Demand Strawberries Store {i+1}",
                "category": "PRODUCE",
                "original_price": 180.0,
                "discount_price": 54.0,
                "quantity": 25,
                "manufacturing_date": "2026-08-22T08:00:00",
                "expiry_date": "2026-08-30T08:00:00",
                "description": "Fresh organic strawberries at 70% off.",
                "front_image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
                "is_active": True
            }, headers=headers)
            if p1.status_code == 201:
                target_product_ids.append(p1.json()["id"])

            p2 = await client.post(f"{API_BASE}/products/", json={
                "shop_id": shop["id"],
                "name": f"Organic Milk Carton Store {i+1}",
                "category": "DAIRY",
                "original_price": 70.0,
                "discount_price": 28.0,
                "quantity": 200,
                "manufacturing_date": "2026-08-22T08:00:00",
                "expiry_date": "2026-08-29T08:00:00",
                "description": "Pure pasteurized organic milk.",
                "front_image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400",
                "is_active": True
            }, headers=headers)
            if p2.status_code == 201:
                target_product_ids.append(p2.json()["id"])
                
            merchants.append({"idx": i, "email": email, "token": token, "shop": shop})

        print(f"  ✓ 10 Merchants initialized with {len(target_product_ids)} tracked inventory items.")

        # Step 2: Register 100 Real Customers
        print("\n[Step 2] Registering 100 Real Concurrent Customer Accounts...")
        customers = []
        async def register_cust(idx):
            email = f"customer_{uuid.uuid4().hex[:8]}@production-test.com"
            r = await client.post(f"{API_BASE}/auth/register", json={
                "email": email,
                "password": "CustomerPassword123!",
                "name": f"Sustained Customer {idx+1}",
                "is_shop_owner": False,
                "phone_number": f"+91990{idx:07d}"
            })
            if r.status_code == 201:
                data = r.json()
                return {"idx": idx, "email": email, "token": data["access_token"], "user": data["user"]}
            return None

        cust_results = await asyncio.gather(*[register_cust(i) for i in range(100)])
        customers = [c for c in cust_results if c is not None]
        print(f"  ✓ {len(customers)} Customer Accounts registered successfully.")

        # Step 3: Run Security and Tenant Isolation Checks
        await run_security_authorization_checks(client, customers, merchants, target_product_ids, report)

        # Step 4: Run Sustained High-Concurrency Load (100 Customers + 10 Merchants)
        print("\n[Step 4] Executing Sustained Multi-Cycle Load Test (100 Concurrent Users + 10 Merchants)...")
        start_load_t = time.time()
        
        cust_sessions = [run_customer_session(client, cust, target_product_ids, report, iterations=4) for cust in customers]
        merchant_sessions = [run_merchant_session(client, m, report, iterations=4) for m in merchants]
        
        await asyncio.gather(*(cust_sessions + merchant_sessions))
        load_duration = time.time() - start_load_t
        print(f"  ✓ Sustained Load Cycle Complete in {load_duration:.2f}s!")

        # Step 5: Stock Verification & Anti-Overselling Check
        print("\n[Step 5] Auditing Stock Numbers & Anti-Overselling Locks...")
        res = await client.get(f"{API_BASE}/products/", timeout=30.0)
        products_map = {p["id"]: p for p in res.json()}
        
        oversell_found = False
        for pid in target_product_ids:
            if pid in products_map:
                prod = products_map[pid]
                rem_qty = prod["quantity"]
                if rem_qty < 0:
                    print(f"  ❌ CRITICAL: Negative stock for {prod['name']}: {rem_qty}")
                    oversell_found = True
                    report.race_condition_errors += 1
                else:
                    print(f"  ✓ Stock Intact: {prod['name']} -> {rem_qty} remaining (Non-negative)")

    print("\n" + "=" * 75)
    print("📊 PRODUCTION LOAD TEST RESULTS")
    print("=" * 75)
    summary = report.summary()
    for k, v in summary.items():
        print(f"  • {k}: {v}")
    print("=" * 75)

    if summary["failed"] == 0 and not oversell_found and report.security_checks_failed == 0:
        print("✅ ALL PRODUCTION CHECKS PASSED: ZERO RACE CONDITIONS, 100% SUCCESS!")
    else:
        print("⚠️ Production validation completed with warnings.")

if __name__ == "__main__":
    asyncio.run(main())
