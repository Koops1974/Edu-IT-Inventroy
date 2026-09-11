// ===== CSV Module =====
const CSVModule = {
    csvData: null,
    headers: [],
    rows: [],
    
    // Parse CSV file
    parseCSV(text) {
        const lines = this.parseCSVLines(text);
        if (lines.length === 0) {
            throw new Error('CSV file is empty');
        }
        
        this.headers = lines[0].map(h => h.trim());
        this.rows = lines.slice(1);
        
        return {
            headers: this.headers,
            rows: this.rows
        };
    },
    
    // Parse CSV lines handling quoted values
    parseCSVLines(text) {
        const lines = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            
            if (char === '"') {
                if (inQuotes && text[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                current += '\t'; // Use tab as delimiter placeholder
            } else if ((char === '\n' || (char === '\r' && text[i + 1] === '\n')) && !inQuotes) {
                if (char === '\r') i++;
                lines.push(current);
                current = '';
            } else if (char === '\r' && !inQuotes) {
                lines.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            lines.push(current);
        }
        
        return lines.map(line => line.split('\t'));
    },
    
    // Get column data for a specific field
    getColumnData(fieldMap) {
        const colIndex = this.headers.indexOf(fieldMap);
        if (colIndex === -1) return [];
        return this.rows.map(row => row[colIndex] || '');
    },
    
    // Create asset objects from mapped columns
    createAssetsFromMapping(mapping) {
        const assets = [];
        
        this.rows.forEach((row, index) => {
            const asset = {};
            
            // Map each field
            for (const [field, header] of Object.entries(mapping)) {
                if (!header) continue;
                const colIndex = this.headers.indexOf(header);
                if (colIndex === -1) continue;
                asset[field] = (row[colIndex] || '').trim();
            }
            
            assets.push(asset);
        });
        
        return assets;
    },
    
    // Download template CSV
    downloadTemplate() {
        const header = 'name,type,serial,model,manufacturer,purchaseDate,school,location,status,assignedTo,ip,notes\n';
        const sampleRow = 'Office Laptop 001,laptop,SN123456,Dell Latitude 5440,Dell,2024-01-15,School 1,Room 101,available,John Smith,192.168.1.50,Standard issue laptop';
        const csvContent = header + sampleRow;
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'it-assets-template.csv';
        link.click();
        URL.revokeObjectURL(link.href);
    },
    
    // Display preview of CSV data
    previewData(headers, rows, limit = 5) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        // Header row
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Data rows
        const tbody = document.createElement('tbody');
        const limitedRows = rows.slice(0, limit);
        limitedRows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach((cell, index) => {
                const td = document.createElement('td');
                td.textContent = cell || '';
                // Highlight mapped columns
                if (cell) td.style.color = '#2563eb';
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        return table;
    }
};