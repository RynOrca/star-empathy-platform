from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    
    logs = []
    page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on('pageerror', lambda err: logs.append(f"[PAGE ERROR] {err}"))
    
    import requests
    r = requests.post('http://localhost:3000/api/auth/guest')
    token = r.json()['data']['token']
    
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(1000)
    
    # Simulate clicking the username
    page.evaluate("window.location.href = '/profile'")
    page.wait_for_load_state('networkidle', timeout=15000)
    page.wait_for_timeout(1000)
    
    # Now go BACK to sky
    page.evaluate("window.location.href = '/sky'")
    page.wait_for_load_state('networkidle', timeout=15000)
    page.wait_for_timeout(1000)
    
    # And back to profile
    page.evaluate("window.location.href = '/profile'")
    page.wait_for_load_state('networkidle', timeout=15000)
    page.wait_for_timeout(1000)
    
    errors = [l for l in logs if 'error' in l.lower() or 'PAGE ERROR' in l or 'warn' in l.lower()]
    print(f"Round-trips: 3 | Errors: {len(errors)}")
    for e in errors:
        print(e)
    
    # Check profile content
    has_sig = page.locator('text=点击编辑签名').count()
    c = page.locator('canvas').count()
    print(f"Profile OK: Sig={has_sig} Canvas={c}")
    
    b.close()
