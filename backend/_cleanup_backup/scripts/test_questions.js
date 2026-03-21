async function testApi() {
    try {
        const res = await fetch('http://localhost:3000/api/commissionary/questions?subcategory_id=123');
        const data = await res.json();
        console.log("=== API Groups for ID 123 (Lavatory) ===");
        console.log(data.groups.map(g => g.item_name));
    } catch (err) {
        console.error("Connection Error:", err.message);
    }
}
testApi();
