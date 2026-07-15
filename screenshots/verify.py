from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate("localStorage.removeItem('token')")
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    title = page.title()
    has_login = page.locator('text=登录').count()
    has_guest = page.locator('text=匿名').count()
    has_canvas = page.locator('canvas').count()
    print(f"Title: {title} | Login: {has_login} | Guest: {has_guest} | Canvas: {has_canvas}")
    page.screenshot(path=r'D:\Code\Working-on-it\star-\screenshots\home.png')
    b.close()
