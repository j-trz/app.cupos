from playwright.sync_api import sync_playwright, expect

def run_verification(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the login page and log in
        page.goto("http://localhost:5173/login")
        page.get_by_label("Email").fill("admin@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()

        # Go to Connection Management page
        page.goto("http://localhost:5173/admin/gestion-conexiones")

        # 1. Create a new connection
        page.get_by_role("button", name="New Connection").click()

        # Wait for modal to appear
        expect(page.get_by_role("heading", name="New Connection")).to_be_visible()

        # Select type
        page.get_by_text("Select a type...").click()
        page.get_by_text("Supabase").click()

        # Fill form
        page.get_by_label("Name").fill("My Test Supabase DB")
        page.get_by_label("Description").fill("A test connection for verification")
        page.get_by_label("Project URL").fill("https://example.supabase.co")
        page.get_by_label("API Key (anon)").fill("test_api_key")

        page.screenshot(path="jules-scratch/verification/01_new_connection_modal.png")

        page.get_by_role("button", name="Save Connection").click()

        # Wait for success and list to update
        expect(page.get_by_text("Connection Saved")).to_be_visible()
        expect(page.get_by_text("My Test Supabase DB")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/02_connection_list.png")

        # 2. Go to Data Mapper page
        page.goto("http://localhost:5173/admin/data-mapper")

        # Wait for page to load
        expect(page.get_by_role("heading", name="Data Mapping")).to_be_visible()

        # Select the new connection
        page.get_by_label("1. Select Connection").select_option(label="My Test Supabase DB")
        page.get_by_label("2. Enter Table Name").fill("products")

        # Mock the API call to get-table-schema
        def handle_route(route, request):
            if "get-table-schema" in request.url:
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    body='{"success":true,"columns":[{"name":"id","type":"uuid"},{"name":"name","type":"text"},{"name":"price","type":"numeric"}]}'
                )
            else:
                route.continue_()

        page.route("**/get-table-schema", handle_route)

        page.get_by_role("button", name="Fetch Schema").click()

        # Wait for schema to be displayed
        expect(page.get_by_text("3. Map Fields")).to_be_visible()
        expect(page.get_by_text("id (uuid)")).to_be_visible()
        expect(page.get_by_text("name (text)")).to_be_visible()

        page.screenshot(path="jules-scratch/verification/03_data_mapper_ui.png")

    finally:
        browser.close()

with sync_playwright() as p:
    run_verification(p)