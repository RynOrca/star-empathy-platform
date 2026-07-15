from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page(viewport={'width':1280,'height':800})
    import requests
    r = requests.post('http://localhost:3000/api/auth/guest')
    token = r.json()['data']['token']
    page.goto('http://localhost:5173/', wait_until='networkidle', timeout=15000)
    page.evaluate(f"localStorage.setItem('token','{token}')")
    page.goto('http://localhost:5173/sky', wait_until='networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    # Move mouse to center of canvas
    canvas = page.locator('canvas')
    box = canvas.bounding_box()
    cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2
    page.mouse.move(cx, cy)
    page.wait_for_timeout(500)
    # Move slightly to trigger hover on a star
    for dx, dy in [(0,0), (50,0), (100,0), (150,0), (200,0), (0,50), (0,100)]:
        page.mouse.move(cx + dx, cy + dy)
        page.wait_for_timeout(200)
    # Check if tooltip appeared (opacity > 0)
    has_tooltip = page.evaluate("""
        () => {
            const divs = document.querySelectorAll('div');
            for (const d of divs) {
                if (d.style.opacity === '1' && d.textContent && d.textContent.length > 0) {
                    const rect = d.getBoundingClientRect();
                    if (rect.width > 0) return d.textContent.slice(0, 50);
                }
            }
            return null;
        }
    """)
    print(f"Tooltip: {has_tooltip or 'NOT FOUND'}")
    b.close()
