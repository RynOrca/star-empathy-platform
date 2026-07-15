from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    
    logs = []
    page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    page.on('pageerror', lambda err: logs.append(f"[PAGE ERROR] {err}"))
    
    # Login via guest
    import requests
    r = requests.post('http://localhost:3000/api/auth/guest')
    token = r.json()['data']['token']
    
    # Go to sky page (like clicking login)
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(2000)
    print("=== SKY PAGE LOADED ===")
    
    # Now click profile link (simulating user clicking username)
    page.evaluate("window.location.href = '/profile'")
    page.wait_for_load_state('networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    print("=== PROFILE PAGE LOADED ===")
    
    # Check errors
    errors = [l for l in logs if 'error' in l.lower() or 'PAGE ERROR' in l]
    print("\n=== ERRORS ===")
    for e in errors:
        print(e)
    
    # Check DOM
    text = page.text_content('body')
    has_sig = page.locator('text=点击编辑签名').count()
    has_back = page.locator('text=星空').count()
    has_canvas = page.locator('canvas').count()
    print(f"\nSignature: {has_sig} | BackBtn: {has_back} | Canvas: {has_canvas}")
    
    # Check if page is "frozen" - does animation frame fire?
    frozen = page.evaluate("""
        () => {
            return new Promise(resolve => {
                let fired = false;
                requestAnimationFrame(() => { fired = true; });
                setTimeout(() => resolve(fired), 1000);
            });
        }
    """)
    print(f"Animation running: {frozen}")
    
    b.close()
