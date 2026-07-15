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
    page.wait_for_timeout(4000)
    
    # Sweep mouse slowly across the entire canvas
    canvas = page.locator('canvas')
    box = canvas.bounding_box()
    for y in range(int(box['y']), int(box['y'] + box['height']), 40):
        for x in range(int(box['x']), int(box['x'] + box['width']), 40):
            page.mouse.move(x, y)
    
    page.wait_for_timeout(500)
    
    # Check tooltip visibility via DOM
    result = page.evaluate("""
        () => {
            const all = document.querySelectorAll('div');
            for (const d of all) {
                const op = getComputedStyle(d).opacity;
                if (op !== '0' && d.textContent && d.textContent.length > 0) {
                    const tx = d.textContent.trim().slice(0, 60);
                    if (tx && tx.length > 0) return `opacity=${op} text="${tx}"`;
                }
            }
            // Check if the tooltip element exists at all
            for (const d of all) {
                if (d.style.marginTop === '1rem' && d.style.backdropFilter) {
                    return `FOUND ELEM: opacity=${d.style.opacity} inner="${d.innerHTML.slice(0,80)}"`;
                }
            }
            return 'NO TOOLTIP FOUND';
        }
    """)
    print(result)
    b.close()
