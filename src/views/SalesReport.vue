<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const sales = ref([])
const loading = ref(true)

onMounted(async () => {
  await loadSales()
})

const loadSales = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('sales')
    .select('id, total_amount, created_at, sale_items (product_id, quantity, price_at_sale, products (name, stock_quantity))')
    .order('created_at', { ascending: false })
  
  if (data) sales.value = data
  loading.value = false
}

const cancelSale = async (sale) => {
  if (!confirm('Are you sure you want to cancel this sale?')) return
  
  try {
    // Delete sale items first
    const { error: deleteError } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', sale.id)
    
    if (deleteError) throw deleteError
    
    // Delete the sale
    const { error: deleteSaleError } = await supabase
      .from('sales')
      .delete()
      .eq('id', sale.id)
    
    if (deleteSaleError) throw deleteSaleError
    
    // Restore stock quantities
    for (const item of sale.sale_items) {
      if (item.products) {
        await supabase
          .from('products')
          .update({ stock_quantity: item.products.stock_quantity + item.quantity })
          .eq('id', item.product_id)
      }
    }
    
    await loadSales()
    alert('Sale cancelled successfully!')
  } catch (error) {
    alert('Error cancelling sale: ' + error.message)
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

const formatDate = (dateStr) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="min-vh-100 bg-light">
    <!-- Header -->
    <nav class="navbar navbar-dark bg-primary sticky-top">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1 fw-bold">Sales Report</span>
        <div class="d-flex gap-2">
          <router-link to="/" class="btn btn-outline-light btn-sm">
            Sales
          </router-link>
          <router-link to="/products" class="btn btn-outline-light btn-sm">
            Products
          </router-link>
          <router-link to="/sales-report" class="btn btn-outline-light btn-sm">
            Sales Report
          </router-link>
          <button @click="logout" class="btn btn-outline-light btn-sm">
            Logout
          </button>
        </div>
      </div>
    </nav>

    <!-- Sales Table -->
    <div class="container-fluid py-4">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading sales...</p>
      </div>
      
      <div v-else-if="sales.length === 0" class="text-center py-5">
        <p class="text-muted">No sales yet</p>
      </div>
      
      <div v-else class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-primary">
            <tr>
              <th>#</th>
              <th>Total (Rs.)</th>
              <th>Date</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sale, index) in sales" :key="sale.id">
              <td>{{ index + 1 }}</td>
              <td>{{ sale.total_amount.toFixed(0) }}</td>
              <td>{{ formatDate(sale.created_at) }}</td>
              <td>
                <ul class="list-unstyled mb-0">
                  <li v-for="item in sale.sale_items" :key="item.id">
                    {{ item.products ? item.products.name : 'Unknown' }} x {{ item.quantity }}
                  </li>
                </ul>
              </td>
              <td>
                <button 
                  class="btn btn-sm btn-danger"
                  @click="cancelSale(sale)"
                >
                  Cancel
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>