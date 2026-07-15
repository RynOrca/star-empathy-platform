from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    # 注册 + 登录
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate("localStorage.removeItem('token')")
    import requests, json
    r = requests.post('http://localhost:3000/api/auth/register', json={'username':'test-verify','password':'test123456'})
    j = r.json()
    if j['code'] == 200:
        token = j['data']['token']
        page.evaluate(f"localStorage.setItem('token','{token}')")
        # 导航到 profile
        page.goto('http://localhost:5173/profile', wait_until='networkidle', timeout=15000)
        title = page.title()
        has_back = page.locator('text=星空').count()
        has_username = page.locator('text=test-verify').count()
        has_sig = page.locator('text=点击编辑签名').count()
        has_canvas = page.locator('canvas').count()
        print(f"Profile: Title={title} | BackBtn={has_back} | Username={has_username} | Sig={has_sig} | Canvas={has_canvas}")
        page.screenshot(path=r'D:\Code\Working-on-it\star-\screenshots\profile.png')
    else:
        print(f"Register failed: {j}")
    b.close()
