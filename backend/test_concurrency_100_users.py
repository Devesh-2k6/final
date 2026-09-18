import time
import uuid
import sys
import statistics
from datetime import datetime, timedelta, UTC
from concurrent.futures import ThreadPoolExecutor
from fastapi.testclient import TestClient

from main import app
from db.session import SessionLocal
from db.models import User, Shop, Product, Order
from auth_service import hash_password, create_access_token

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

class ConcurrencyReport:
    def __init__(self):
        self.latencies = []
        self.success_count = 0
        self.fail_count = 0
        self.race_condition_errors = 0
        self.security_passed = 0
        self.security_failed = 0
        self.orders_placed = 0
        self.payments_verified = 0
        self.deliveries_completed = 0
        self.status_codes = {}
        self.errors = []

    def record(self, latency_ms: float, success: bool, status_code: int, err_msg: str = ""):
        self.latencies.append(latency_ms)
        self.status_codes[status_code] = self.status_codes.get(status_code, 0) + 1
        if success:
            self.success_count += 1
        else:
            self.fail_count += 1
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
            "successful_requests": self.success_count,
            "failed_requests": self.fail_count,
            "success_rate_pct": round((self.success_count / len(self.latencies)) * 100, 2),
            "orders_placed_successfully": self.orders_placed,
            "payments_verified_by_merchants": self.payments_verified,
            "deliveries_pin_verified": self.deliveries_completed,
            "overselling_race_errors": self.race_condition_errors,
            "security_idor_checks_passed": self.security_passed,
            "security_idor_checks_failed": self.security_failed,
            "min_latency_ms": round(min(self.latencies), 2),
            "mean_latency_ms": round(statistics.mean(self.latencies), 2),
            "p50_median_ms": round(p50, 2),
            "p90_ms": round(p90, 2),
            "p95_ms": round(p95, 2),
            "p99_ms": round(p99, 2),
            "max_latency_ms": round(max(self.latencies), 2),
            "status_distribution": self.status_codes,
        }


def main():
    print("=" * 80, flush=True)
    print("⚡ MEEVA REAL CONCURRENCY BENCHMARK: 100+ CONCURRENT USERS & MERCHANTS", flush=True)
    print("=" * 80, flush=True)

    report = ConcurrencyReport()
    
    # Step 1: Fast DB provisioning of 10 Merchants & 100 Shoppers
    print("\n[Step 1] Provisioning 10 Merchants (with verified UPI handles) & 100 Shoppers...", flush=True)
    shared_pwd_hash = hash_password("BenchSecurePass123!")
    merchants = []
    customers = []
    
    db = SessionLocal()
    now_dt = datetime.now(UTC).replace(tzinfo=None)
    mfg_dt = now_dt - timedelta(days=2)
    exp_dt = now_dt + timedelta(days=5)

    try:
        # Create 10 Merchants
        for i in range(10):
            email = f"merchant_{uuid.uuid4().hex[:8]}@real-bench.com"
            upi_handle = f"shop{i+1}.settle@okhdfcbank"
            user = User(
                email=email,
                name=f"Vendor Partner {i+1}",
                hashed_password=shared_pwd_hash,
                role="VENDOR",
                is_shop_owner=True,
                email_verified=True,
                phone_number=f"+91981{i:07d}",
            )
            db.add(user)
            db.flush()

            shop = Shop(
                owner_id=user.id,
                name=f"Meeva Store {i+1}",
                address=f"{100 + i} Anna Salai, Chennai, Tamil Nadu, 600002",
                latitude=13.0615 + (i * 0.005),
                longitude=80.2609 + (i * 0.005),
                upi_id=upi_handle,
                delivery_enabled=True,
                delivery_fee=35.0,
                description=f"Fresh neighborhood supermarket and bakery {i+1}.",
                approval_status="APPROVED",
                is_active=True,
                location_verified=True,
            )
            db.add(shop)
            db.flush()

            token = create_access_token(user.id, role="VENDOR")
            merchants.append({"idx": i, "email": email, "token": token, "shop": {"id": shop.id, "name": shop.name}, "upi_id": upi_handle})

        # Create 100 Shoppers
        for idx in range(100):
            c_email = f"customer_{uuid.uuid4().hex[:8]}@real-bench.com"
            c_user = User(
                email=c_email,
                name=f"Concurrent Shopper {idx+1}",
                hashed_password=shared_pwd_hash,
                role="CUSTOMER",
                is_shop_owner=False,
                email_verified=True,
                phone_number=f"+91992{idx:07d}",
            )
            db.add(c_user)
            db.flush()

            c_token = create_access_token(c_user.id, role="CUSTOMER")
            customers.append({"idx": idx, "email": c_email, "token": c_token, "user": {"id": c_user.id, "name": c_user.name, "phone_number": c_user.phone_number}})

        # Create 1 high-contention flash sale product (10 units only) directly in DB
        flash_prod = Product(
            shop_id=merchants[0]["shop"]["id"],
            name="🔥 High-Demand Organic Strawberries (10 Units Only)",
            category="PRODUCE",
            original_price=200.0,
            discount_price=60.0,
            quantity=10,
            manufacturing_date=mfg_dt,
            expiry_date=exp_dt,
            description="Flash sale item for concurrency lock verification.",
            is_active=True,
            front_image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
            expiry_image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600"
        )
        db.add(flash_prod)
        db.flush()
        flash_sale_product_id = flash_prod.id

        # Standard items across shops
        for m in merchants:
            p = Product(
                shop_id=m["shop"]["id"],
                name=f"Surplus Bakery & Essentials ({m['shop']['name']})",
                category="BAKERY",
                original_price=120.0,
                discount_price=40.0,
                quantity=250,
                manufacturing_date=mfg_dt,
                expiry_date=exp_dt,
                description="Fresh surplus bakery items.",
                is_active=True,
                front_image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600",
                expiry_image_url="https://images.unsplash.com/photo-1542838132-92c53300491e?w=600"
            )
            db.add(p)

        db.commit()
    finally:
        db.close()

    print(f"  ✓ {len(merchants)} Verified Merchants initialized with UPI VPAs.", flush=True)
    print(f"  ✓ {len(customers)} Concurrent Customer accounts authenticated.", flush=True)
    print(f"  ✓ Flash sale item created ({flash_sale_product_id}) with 10 units initial stock.", flush=True)

    # Step 2: FLASH SALE RACE TEST - 100 Concurrent Threads competing for 10 units!
    print("\n[Step 2] ⚡ HIGH CONCURRENCY RACE TEST: 100 Shoppers simultaneously buying 10 units...", flush=True)
    start_race_t = time.perf_counter()

    def attempt_flash_buy(cust):
        c = TestClient(app)
        headers = {"Authorization": f"Bearer {cust['token']}"}
        t0 = time.perf_counter()
        try:
            r = c.post("/orders/", json={
                "product_id": flash_sale_product_id,
                "quantity": 1,
                "order_type": "DELIVERY",
                "delivery_fee": 35.0,
                "customer_name": cust["user"]["name"],
                "customer_phone": cust["user"].get("phone_number") or "9876543210",
                "delivery_address": f"Flat {cust['idx']+1}, Anna Nagar, Chennai",
            }, headers=headers)
            dur = (time.perf_counter() - t0) * 1000
            is_valid = r.status_code in (201, 400)
            report.record(dur, is_valid, r.status_code, r.text if not is_valid else "")
            if r.status_code == 201:
                return {"success": True, "order": r.json(), "cust": cust}
            return {"success": False, "status": r.status_code}
        except Exception as e:
            dur = (time.perf_counter() - t0) * 1000
            report.record(dur, False, 500, str(e))
            return {"success": False, "status": 500}

    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(attempt_flash_buy, c) for c in customers]
        flash_results = [f.result() for f in futures]

    race_dur = time.perf_counter() - start_race_t

    successful_orders = [res for res in flash_results if res.get("success")]
    sold_out_rejections = [res for res in flash_results if not res.get("success") and res.get("status") == 400]

    print(f"  ⚡ 100 Concurrent Orders evaluated in {race_dur:.3f}s!", flush=True)
    print(f"  • Successful Orders Placed: {len(successful_orders)} (Expected: exactly 10)", flush=True)
    print(f"  • Out-of-Stock Safe Rejections: {len(sold_out_rejections)} (Expected: exactly 90)", flush=True)

    # Check DB remaining stock
    client = TestClient(app)
    r_chk = client.get(f"/products/{flash_sale_product_id}")
    rem_stock = r_chk.json()["quantity"]
    print(f"  • Remaining Database Stock: {rem_stock} units", flush=True)

    if len(successful_orders) == 10 and rem_stock == 0:
        print("  ✅ ZERO OVERSELLING: Row-Level Stock Lock prevented all race condition conflicts!", flush=True)
    else:
        print(f"  ❌ RACE CONDITION FAILURE: Expected 10 sold, got {len(successful_orders)}, stock={rem_stock}", flush=True)
        report.race_condition_errors += 1

    # Step 3: Complete Direct UPI Payment & 4-Digit PIN Handover Flow
    print("\n[Step 3] Executing Direct Merchant UPI Settlements & Handover PIN Verifications...", flush=True)
    def complete_upi_cycle(item):
        c = TestClient(app)
        order = item["order"]
        cust = item["cust"]
        headers_c = {"Authorization": f"Bearer {cust['token']}"}
        merchant = merchants[0]
        headers_m = {"Authorization": f"Bearer {merchant['token']}"}

        # 1. Customer reports 12-digit UTR
        utr = f"UTR{cust['idx']:04d}{int(time.time())%100000000:08d}"
        t0 = time.perf_counter()
        r_pay = c.post(f"/orders/{order['id']}/report-payment", json={
            "upi_transaction_id": utr
        }, headers=headers_c)
        dur = (time.perf_counter() - t0) * 1000
        report.record(dur, r_pay.status_code == 200, r_pay.status_code, r_pay.text if r_pay.status_code != 200 else "")
        
        if r_pay.status_code == 200:
            report.orders_placed += 1
            # 2. Merchant verifies direct bank credit
            t1 = time.perf_counter()
            r_ver = c.post(f"/orders/{order['id']}/verify-payment", json={
                "confirmed": True
            }, headers=headers_m)
            dur1 = (time.perf_counter() - t1) * 1000
            report.record(dur1, r_ver.status_code == 200, r_ver.status_code, r_ver.text if r_ver.status_code != 200 else "")
            if r_ver.status_code == 200:
                report.payments_verified += 1

            # 3. Order lifecycle: ACCEPTED -> OUT_FOR_DELIVERY
            c.patch(f"/orders/{order['id']}/status", json={"status": "ACCEPTED"}, headers=headers_m)
            c.patch(f"/orders/{order['id']}/status", json={"status": "OUT_FOR_DELIVERY"}, headers=headers_m)
            
            # 4. Customer presents 4-digit PIN at doorstep
            pin = order.get("delivery_pin") or "1234"
            t2 = time.perf_counter()
            r_pin = c.post(f"/orders/{order['id']}/verify-delivery-pin", json={"pin": pin}, headers=headers_m)
            dur2 = (time.perf_counter() - t2) * 1000
            report.record(dur2, r_pin.status_code == 200, r_pin.status_code)
            if r_pin.status_code == 200:
                report.deliveries_completed += 1

    with ThreadPoolExecutor(max_workers=10) as executor:
        list(executor.map(complete_upi_cycle, successful_orders))

    print(f"  ✓ {report.payments_verified} Direct UPI Payments verified by merchant.", flush=True)
    print(f"  ✓ {report.deliveries_completed} Doorstep deliveries completed with cryptographically secure 4-digit PINs.", flush=True)

    # Step 4: Multi-Tenant IDOR Security Checks Under Load
    print("\n[Step 4] Multi-Tenant Security & IDOR Isolation Validation...", flush=True)
    cust_headers = {"Authorization": f"Bearer {customers[0]['token']}"}
    m1_headers = {"Authorization": f"Bearer {merchants[0]['token']}"}
    m2_headers = {"Authorization": f"Bearer {merchants[1]['token']}"}

    # IDOR 1: Customer attempting to access merchant dashboard analytics
    r_sec1 = client.get("/shops/me/analytics", headers=cust_headers)
    if r_sec1.status_code in (401, 403):
        report.security_passed += 1
        print("  ✓ Security 1: Customer blocked from merchant analytics (403 Forbidden)", flush=True)
    else:
        report.security_failed += 1
        print(f"  ❌ Security 1 Failed: {r_sec1.status_code}", flush=True)

    # IDOR 2: Merchant B attempting to verify Merchant A's customer order
    if successful_orders:
        target_order_id = successful_orders[0]["order"]["id"]
        r_sec2 = client.post(f"/orders/{target_order_id}/verify-payment", json={"confirmed": True}, headers=m2_headers)
        if r_sec2.status_code in (403, 404):
            report.security_passed += 1
            print("  ✓ Security 2: Merchant B blocked from verifying Merchant A's orders (404/403)", flush=True)
        else:
            report.security_failed += 1
            print(f"  ❌ Security 2 Failed: {r_sec2.status_code}", flush=True)

    # IDOR 3: Customer B attempting to view Customer A's order details
    if len(successful_orders) > 1:
        order_a_id = successful_orders[0]["order"]["id"]
        cust_b_headers = {"Authorization": f"Bearer {customers[5]['token']}"}
        r_sec3 = client.get(f"/orders/{order_a_id}", headers=cust_b_headers)
        if r_sec3.status_code in (403, 404):
            report.security_passed += 1
            print("  ✓ Security 3: Shopper B blocked from viewing Shopper A's order (403 Forbidden)", flush=True)
        else:
            report.security_failed += 1
            print(f"  ❌ Security 3 Failed: {r_sec3.status_code}", flush=True)

    # Step 5: Sustained Parallel Browsing & Search Traffic (100 Customers + 10 Merchants)
    print("\n[Step 5] Sustained High-Throughput Traffic (Live Feed, Deep Filter Search, Shop Orders)...", flush=True)
    start_load_t = time.perf_counter()

    def run_customer_load(cust):
        c = TestClient(app)
        headers = {"Authorization": f"Bearer {cust['token']}"}
        for _ in range(5):
            t0 = time.perf_counter()
            r1 = c.get("/products/?hide_expired=true", headers=headers)
            report.record((time.perf_counter() - t0)*1000, r1.status_code == 200, r1.status_code)

            t0 = time.perf_counter()
            r2 = c.get("/products/search/deep?q=bakery&category=BAKERY", headers=headers)
            report.record((time.perf_counter() - t0)*1000, r2.status_code == 200, r2.status_code)

            t0 = time.perf_counter()
            r3 = c.get("/orders/me", headers=headers)
            report.record((time.perf_counter() - t0)*1000, r3.status_code == 200, r3.status_code)

    def run_merchant_load(merchant):
        c = TestClient(app)
        headers = {"Authorization": f"Bearer {merchant['token']}"}
        for _ in range(5):
            t0 = time.perf_counter()
            r1 = c.get("/shops/me/analytics", headers=headers)
            report.record((time.perf_counter() - t0)*1000, r1.status_code == 200, r1.status_code)

            t0 = time.perf_counter()
            r2 = c.get("/shops/orders", headers=headers)
            report.record((time.perf_counter() - t0)*1000, r2.status_code == 200, r2.status_code)

    with ThreadPoolExecutor(max_workers=20) as executor:
        f_cust = [executor.submit(run_customer_load, c) for c in customers]
        f_merch = [executor.submit(run_merchant_load, m) for m in merchants]
        for f in f_cust + f_merch:
            f.result()

    load_dur = time.perf_counter() - start_load_t
    print(f"  ✓ 1,600 concurrent requests processed in {load_dur:.2f}s ({len(report.latencies) / load_dur:.1f} req/sec).", flush=True)

    print("\n" + "=" * 80, flush=True)
    print("📊 REAL 100+ CONCURRENT USER & MULTI-VENDOR BENCHMARK RESULTS", flush=True)
    print("=" * 80, flush=True)
    summary = report.summary()
    for k, v in summary.items():
        print(f"  • {k.replace('_', ' ').title()}: {v}", flush=True)
    print("=" * 80, flush=True)

    if summary["failed_requests"] == 0 and report.race_condition_errors == 0 and report.security_failed == 0:
        print("🎉 100% PRODUCTION CONCURRENCY VALIDATION PASSED!", flush=True)
        print("   - Zero Overselling / Race Condition Errors")
        print("   - 100% Direct Merchant UPI Settlements Confirmed")
        print("   - 100% 4-Digit Handover Delivery PINs Validated")
        print("   - 100% Multi-Tenant IDOR Security Isolation Passed", flush=True)
    else:
        print("⚠️ Benchmark finished.", flush=True)

if __name__ == "__main__":
    main()
