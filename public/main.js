let deleteProductId = null;

document.addEventListener('DOMContentLoaded', () => {
    const forceBtn = document.getElementById('forceCheckBtn');
    
    forceBtn.addEventListener('click', async () => {
        forceBtn.disabled = true;
        forceBtn.innerText = 'Checking... (Wait ~30s)';
        forceBtn.style.opacity = '0.5';

        try {
            const response = await fetch('/api/check-stock', { method: 'POST' });
            if (response.ok) {
                alert('Check complete! Refreshing data...');
                fetchProducts(); // Refresh the table
            } else {
                alert('Error running stock check.');
            }
        } catch (err) {
            alert('Server connection error.');
        } finally {
            forceBtn.disabled = false;
            forceBtn.innerText = 'Force Stock Check Now';
            forceBtn.style.opacity = '1';
        }
    });
    
    fetchProducts();
    
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productName = document.getElementById('productName').value;
        const productUrl = document.getElementById('productUrl').value;
        const productMerchant = document.getElementById('productMerchant').value;
        
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ productName, productUrl, productMerchant })
        });
        
        if (response.ok) {
            document.getElementById('productName').value = '';
            document.getElementById('productUrl').value = '';
            document.getElementById('productMerchant').value = '';
            fetchProducts();
        }
    });

    document.getElementById('cancelDelete').addEventListener('click', () => {
        document.getElementById('deleteModal').style.display = 'none';
        deleteProductId = null;
    });

    document.getElementById('confirmDelete').addEventListener('click', async () => {
        if (deleteProductId !== null) {
            try {
                const response = await fetch(`/api/products/${deleteProductId}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    document.getElementById('deleteModal').style.display = 'none';
                    deleteProductId = null;
                    fetchProducts();
                } else {
                    let errorMessage = response.statusText;
                    try {
                        const errData = await response.json();
                        errorMessage = errData.error || errorMessage;
                    } catch(e) {}
                    alert(`Deletion failed: ${response.status} - ${errorMessage}`);
                }
            } catch (error) {
                alert(`Network or server error: ${error.message}`);
            }
        }
    });

});

async function fetchProducts() {
    const response = await fetch('/api/products');
    const products = await response.json();
    
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';
    
    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.merchant}</td>
            <td>${product.lastPrice}</td>
            <td>${product.lastChecked}</td>
            <td>${product.status}</td>
            <td>${product.history.length === 0 ? 'None' : product.history.join(', ')}</td>
            <td><button class="btn-danger" onclick="promptDelete(${product.id})">Delete</button></td>
        `;
        tbody.appendChild(tr);
    });
}

window.promptDelete = function(id) {
    deleteProductId = id;
    document.getElementById('deleteModal').style.display = 'block';
};