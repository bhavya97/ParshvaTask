const express = require('express')
const path = require('path')
const xlsx = require('xlsx')
const fs = require('fs')

const app = express()
const PORT = 3000

let createdDockets = []
let supplierData = null // Global variable to store supplier data
let purchaseOrderData = null // Global variable to store purchase order data

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')))

// Middleware to parse JSON in requests
app.use(express.json())

// Initialize data on app startup
const initializeData = () => {
  supplierData = []
  purchaseOrderData = []

  const workbook = xlsx.readFile('export29913.xlsx') // Replace with the path to your XLSX file
  const sheetName = 'Base Currency (AUD)' // Replace with the actual sheet name

  const worksheet = workbook.Sheets[sheetName]

  const csvData = xlsx.utils.sheet_to_csv(worksheet, { header: 1 })
  const rows = csvData.split('\n').map((row) => row.split(','))

  rows.forEach((row) => {
    const supplier = row[11] // Assuming 'Supplier' is at index 11, adjust as needed
    const poNumber = row[1] // Assuming 'PO Number' is at index 1, adjust as needed

    if (supplier && !supplierData.includes(supplier)) {
      supplierData.push(supplier)
    }

    if (poNumber) {
      purchaseOrderData.push({
        'PO Number': poNumber,
        supplier: row[11],
      })
    }
  })

  const docketFilePath = path.join(__dirname, 'dockets.json')
  try {
    const docketFileContent = fs.readFileSync(docketFilePath, 'utf8')
    createdDockets = JSON.parse(docketFileContent)
  } catch (error) {
    console.error('Error reading docket data from file:', error)
    createdDockets = [] // Initialize as an empty array if there's an error
  }
}

// Serve unique supplier names
app.get('/api/suppliers', (req, res) => {
  res.json(supplierData)
})

app.get('/api/get-dockets', (req, res) => {
  // Implement logic to read docket data from a JSON file or another data source
  // For now, assume you have a global array storing dockets
  res.json(createdDockets) // Replace with the actual source of docket data
})

// Serve purchase orders based on the selected supplier
app.post('/api/purchase-orders', (req, res) => {
  const selectedSupplier = req.body.supplierName // Assuming the supplierName is sent in the request body
  const filteredPurchaseOrders = purchaseOrderData
    .filter((row) => row.supplier === selectedSupplier)
    .map((row) => ({ 'PO Number': row['PO Number'], supplier: row.supplier }))

  res.json(filteredPurchaseOrders)
})

app.post('/api/submit-docket', (req, res) => {
  const docketData = req.body
  createdDockets.push(docketData)
  saveDocketsToFile()
  res.json({ message: 'Docket submitted successfully' })
})

app.get('/api/dockets', (req, res) => {
  res.json(createdDockets)
})

// Function to save docket data to a JSON file
const saveDocketsToFile = () => {
  const docketFilePath = path.join(__dirname, 'dockets.json')
  fs.appendFile(docketFilePath, JSON.stringify(createdDockets), (err) => {
    if (err) {
      console.error('Error saving dockets to file:', err)
    } else {
      console.log('Dockets saved to file successfully.')
    }
  })
}

app.listen(PORT, () => {
  initializeData()
  console.log(`Server is running at http://localhost:${PORT}`)
})
