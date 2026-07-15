from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    
    # Capture ALL console messages
    logs = []
    page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on('pageerror', lambda err: logs.append(f"[PAGE ERROR] {err}"))
    
    # Login first
    import requests
    r = requests.post('http://localhost:3000/api/auth/register', json={'username':'test-prof','password':'test123456'})
    j = r.json()
    token = j['data']['token'] if j['code'] == 200 else None
    if not token:
        r2 = requests.post('http://localhost:3000/api/auth/login', json={'username':'test-prof','password':'test123456'})
        token = r2.json()['data']['token']
    
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    
    # Navigate to profile
    page.goto('http://localhost:5173/profile', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    
    print("=== CONSOLE LOGS ===")
    for log in logs[-30:]:
        print(log)
    
    # Check page state
    text = page.text_content('body')
    if text:
        print("\n=== BODY TEXT (first 500 chars) ===")
        clean = text.strip()[:500]
        print(clean)
    
    # Check for loading or error states
    has_loading = page.locator('text=...').count()
    has_error = page.locator('.error').count()
    has_canvas = page.locator('canvas').count()
    print(f"\nLoading indicator: {has_loading}")
    print(f"Error element: {has_error}")
    print(f"Canvas count: {has_canvas}")
    
    b.close()
