<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const products = ref([])
const cart = ref([])
const loading = ref(true)
const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = computed(() => {
  const cats = [...new Set(products.value.map(p => p.category || 'General'))]
  return ['all', ...cats]
})

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchesCategory = selectedCategory.value === 'all' || p.category === selectedCategory.value
    return matchesSearch && matchesCategory && p.stock_quantity > 0
  })
})

const cartTotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const cartCount = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.quantity, 0)
})

onMounted(async () => {
  await loadProducts()
})

const loadProducts = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .gt('stock_quantity', 0)
    .order('name')
  
  if (data) products.value = data
  loading.value = false
}

const addToCart = (product) => {
  const existing = cart.value.find(item => item.product_id === product.id)
  if (existing) {
    if (existing.quantity < product.stock_quantity) {
      existing.quantity++
    }
  } else {
    cart.value.push({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      stock_quantity: product.stock_quantity
    })
  }
}

const updateQuantity = (item, delta) => {
  const newQty = item.quantity + delta
  if (newQty > 0 && newQty <= item.stock_quantity) {
    item.quantity = newQty
  } else if (newQty <= 0) {
    removeFromCart(item)
  }
}

const removeFromCart = (item) => {
  const index = cart.value.indexOf(item)
  if (index > -1) {
    cart.value.splice(index, 1)
  }
}

const completeSale = async () => {
  if (cart.value.length === 0) return
  
  try {
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert([{ total_amount: cartTotal.value }])
      .select()
      .single()
    
    if (saleError) throw saleError
    
    for (const item of cart.value) {
      await supabase.from('sale_items').insert([{
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_sale: item.price
      }])
      
      await supabase
        .from('products')
        .update({ stock_quantity: item.stock_quantity - item.quantity })
        .eq('id', item.product_id)
    }
    
    cart.value = []
    await loadProducts()
    
    alert('Sale completed successfully!')
  } catch (error) {
    alert('Error completing sale: ' + error.message)
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div class="min-vh-100 bg-light">
    <!-- Header -->
    <nav class="navbar navbar-dark bg-primary sticky-top">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1 fw-bold">Mini POS</span>
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

    <!-- Search & Filter -->
    <div class="container-fluid py-3">
      <div class="row g-2">
        <div class="col-12">
          <input
            v-model="searchQuery"
            type="text"
            class="form-control"
            placeholder="Search products..."
          />
        </div>
        <div class="col-12">
          <div class="d-flex gap-2 overflow-auto pb-2">
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat"
              :class="[
                'btn btn-sm',
                selectedCategory === cat 
                  ? 'btn-primary' 
                  : 'btn-outline-secondary'
              ]"
            >
              {{ cat === 'all' ? 'All' : cat }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Products Grid -->
    <div class="container-fluid pb-25">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading products...</p>
      </div>
      
      <div v-else-if="filteredProducts.length === 0" class="text-center py-5">
        <p class="text-muted">No products found</p>
        <router-link to="/products" class="btn btn-primary mt-3">
          Add Products
        </router-link>
      </div>
      
      <div v-else class="row g-3">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="col-6 col-md-4 col-lg-3"
        >
          <div 
            class="card h-100 shadow-sm product-card"
            @click="addToCart(product)"
          >
            <div class="card-body text-center">
              <h5 class="card-title fw-semibold">{{ product.name }}</h5>
              <p class="card-text text-primary fw-bold fs-5">Rs. {{ product.price.toFixed(0) }}</p>
              <p class="card-text text-muted small">Stock: {{ product.stock_quantity }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Cart Summary (Fixed Bottom) -->
    <div v-if="cart.length > 0" class="card fixed-bottom border-top shadow-lg">
      <div class="card-body">
        <!-- Cart Items -->
        <div class="d-flex gap-2 overflow-auto pb-3 mb-3">
          <div 
            v-for="item in cart" 
            :key="item.product_id" 
            class="card flex-shrink-0" 
            style="min-width: 150px;"
          >
            <div class="card-body py-2 px-3">
              <h6 class="card-title mb-1">{{ item.name }}</h6>
              <p class="text-primary fw-bold mb-2">Rs. {{ item.price.toFixed(0) }}</p>
              <div class="d-flex align-items-center justify-content-between">
                <button @click="updateQuantity(item, -1)" class="btn btn-sm btn-outline-secondary">-</button>
                <span class="fw-bold">{{ item.quantity }}</span>
                <button @click="updateQuantity(item, 1)" class="btn btn-sm btn-outline-secondary">+</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Total & Checkout -->
        <div class="d-flex justify-content-between align-items-center">
          <div>
            <p class="text-muted mb-0 small">{{ cartCount }} items in cart</p>
            <h4 class="mb-0 fw-bold text-primary">Rs. {{ cartTotal.toFixed(0) }}</h4>
          </div>
          <button
            @click="completeSale"
            class="btn btn-success btn-lg px-5"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>

    <!-- Empty Cart Hint -->
    <div v-else class="card fixed-bottom border-top">
      <div class="card-body text-center py-3">
        <p class="text-muted mb-0">Tap products above to add to cart</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pb-25 {
  padding-bottom: 200px;
}
.product-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.product-card:active {
  transform: scale(0.98);
}
</style>