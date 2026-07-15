from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate("localStorage.removeItem('token')")
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    
    # Collect console errors
    errors = []
    page.on('console', lambda msg: errors.append(f"[{msg.type}] {msg.text}") if msg.type == 'error' else None)
    
    # Wait a bit then check DOM
    page.wait_for_timeout(2000)
    
    text = page.text_content('body')
    print("=== BODY TEXT (first 1000 chars) ===")
    print(text[:1000] if text else "EMPTY")
    print()
    print("=== CONSOLE ERRORS ===")
    for e in errors[-10:]:
        print(e)
    
    # Check key elements
    for sel in ['button', 'input', 'canvas', 'h1', 'h2', 'h3', 'p', 'a']:
        count = page.locator(sel).count()
        if count > 0:
            print(f"<{sel}>: {count}")
    
    b.close()
