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
    
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    print("SkyPage loaded")
    
    # Click username via DOM (SPA navigation)
    nav_user = page.locator('.nav-user')
    if nav_user.count() > 0:
        nav_user.click()
        page.wait_for_load_state('networkidle', timeout=10000)
        page.wait_for_timeout(2000)
        print("Clicked username → ProfilePage loaded")
    else:
        print("No nav-user found!")
    
    # Check profile
    sig = page.locator('text=点击编辑签名').count()
    canvas = page.locator('canvas').count()
    text = page.text_content('body')[:200] if page.text_content('body') else "EMPTY"
    print(f"Profile: Sig={sig} Canvas={canvas}")
    
    errors = [l for l in logs if 'error' in l.lower() or 'PAGE ERROR' in l]
    print(f"Errors: {len(errors)}")
    for e in errors[-5:]:
        print(e)
    
    # Now click back button
    back = page.locator('text=星空').first
    if back.count() > 0:
        back.click()
        page.wait_for_load_state('networkidle', timeout=10000)
        page.wait_for_timeout(2000)
        print("Clicked back → SkyPage loaded")
    
    b.close()
