fetch('http://localhost:3000/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: "test@example.com",
        password: "supersecret123" // The password we used to register earlier
    })
})
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error("Error:", err));