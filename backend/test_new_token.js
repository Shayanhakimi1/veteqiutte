// توکن جدید
const newToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJtb2JpbGUiOiJhZG1pbiIsImlzQWRtaW4iOnRydWUsImlhdCI6MTc1NjM3MTQwOSwiZXhwIjoxNzU2NDU3ODA5fQ.1jRRgF5UYcgz8EIyLtdpfbAMJQt8bIDhtnlPt5jJJyM';

async function testNewToken() {
  try {
    console.log('Testing new admin token...');
    
    // استفاده از fetch داخلی Node.js (نسخه 18+)
    const response = await fetch('http://localhost:3001/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${newToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Success! Response data:', data);
      if (Array.isArray(data)) {
        console.log('Number of users:', data.length);
        if (data.length > 0) {
          console.log('First user:', data[0]);
        }
      } else {
        console.log('Response is not an array:', typeof data);
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

testNewToken();