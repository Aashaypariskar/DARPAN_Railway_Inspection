async function testExport() {
  try {
    const res = await fetch('http://localhost:8080/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@darpan.com',
        password: 'password'
      })
    });
    
    if (!res.ok) {
        console.error("Login failed with status:", res.status);
        const text = await res.text();
        console.error("Response:", text.substring(0, 200));
        return;
    }
    
    const data = await res.json();
    const token = data.token;
    
    console.log("Logged in. Token:", token ? token.substring(0, 10) + '...' : 'none');
    
    const exportRes = await fetch('http://localhost:8080/api/reports/export/csv?fromDate=2024-01-01&toDate=2025-01-01&type=SESSION_DETAILS&moduleType=ALL', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!exportRes.ok) {
        console.error("Export Failed. Status:", exportRes.status);
        const text = await exportRes.text();
        console.error("Response:", text.substring(0, 200));
        return;
    }
    
    const buffer = await exportRes.arrayBuffer();
    
    console.log("Export Success. Data length:", buffer.byteLength);
  } catch (err) {
    console.error("Export Failed.");
    console.error(err.message);
  }
}

testExport();
