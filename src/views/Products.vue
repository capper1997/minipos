<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const editingProduct = ref(null)
const searchQuery = ref('')

const form = ref({
  name: '',
  price: '',
  stock_quantity: '',
  category: ''
})

const filteredProducts = ref([])

onMounted(async () => {
  await loadProducts()
})

const loadProducts = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('name')
  
  if (data) {
    products.value = data
    filteredProducts.value = data
  }
  loading.value = false
}

const searchProducts = () => {
  if (!searchQuery.value) {
    filteredProducts.value = products.value
  } else {
    filteredProducts.value = products.value.filter(p => 
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.category?.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }
}

const openModal = (product = null) => {
  editingProduct.value = product
  if (product) {
    form.value = { ...product }
  } else {
    form.value = {
      name: '',
      price: '',
      stock_quantity: '',
      category: ''
    }
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingProduct.value = null
}

const saveProduct = async () => {
  try {
    const productData = {
      name: form.value.name,
      price: parseFloat(form.value.price),
      stock_quantity: parseInt(form.value.stock_quantity),
      category: form.value.category || 'General'
    }
    
    if (editingProduct.value) {
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProduct.value.id)
      
      if (error) throw error
    } else {
      const { error } = await supabase
        .from('products')
        .insert([productData])
      
      if (error) throw error
    }
    
    await loadProducts()
    closeModal()
  } catch (error) {
    alert('Error saving product: ' + error.message)
  }
}

const deleteProduct = async (product) => {
  if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return
  
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
    
    if (error) throw error
    await loadProducts()
  } catch (error) {
    alert('Error deleting product: ' + error.message)
  }
}

const logout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

const getStockClass = (qty) => {
  if (qty > 10) return 'bg-success'
  if (qty > 0) return 'bg-warning'
  return 'bg-danger'
}
</script>

<template>
  <div class="min-vh-100 bg-light">
    <!-- Header -->
    <nav class="navbar navbar-dark bg-primary sticky-top">
      <div class="container-fluid">
        <span class="navbar-brand mb-0 h1 fw-bold">Products</span>
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

    <!-- Search -->
    <div class="container-fluid py-3">
      <input
        v-model="searchQuery"
        @input="searchProducts"
        type="text"
        class="form-control"
        placeholder="Search products..."
      />
    </div>

    <!-- Add Button -->
    <div class="container-fluid pb-3">
      <button
        @click="openModal()"
        class="btn btn-primary w-100 btn-lg"
      >
        + Add New Product
      </button>
    </div>

    <!-- Products List -->
    <div class="container-fluid pb-5">
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2 text-muted">Loading products...</p>
      </div>
      
      <div v-else-if="filteredProducts.length === 0" class="text-center py-5">
        <p class="text-muted">No products yet</p>
        <p class="text-muted small">Add your first product to get started!</p>
      </div>
      
      <div v-else class="row g-3">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="col-12"
        >
          <div class="card shadow-sm">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start">
                <div>
                  <h5 class="card-title fw-semibold mb-1">{{ product.name }}</h5>
                  <p class="text-muted mb-2 small">{{ product.category }}</p>
                </div>
                <div class="text-end">
                  <h5 class="text-primary fw-bold mb-1">Rs. {{ product.price.toFixed(0) }}</h5>
                  <span :class="['badge', getStockClass(product.stock_quantity)]">
                    Stock: {{ product.stock_quantity }}
                  </span>
                </div>
              </div>
              <div class="d-flex gap-2 mt-3">
                <button
                  @click="openModal(product)"
                  class="btn btn-outline-primary flex-grow-1"
                >
                  Edit
                </button>
                <button
                  @click="deleteProduct(product)"
                  class="btn btn-outline-danger flex-grow-1"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              {{ editingProduct ? 'Edit Product' : 'Add Product' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal"></button>
          </div>
          <form @submit.prevent="saveProduct">
            <div class="modal-body">
              <div class="mb-3">
                <label class="form-label">Product Name</label>
                <input
                  v-model="form.name"
                  type="text"
                  class="form-control"
                  placeholder="Enter product name"
                  required
                />
              </div>
              
              <div class="mb-3">
                <label class="form-label">Price (Rs.)</label>
                <input
                  v-model="form.price"
                  type="number"
                  step="1"
                  min="0"
                  class="form-control"
                  placeholder="0"
                  required
                />
              </div>
              
              <div class="mb-3">
                <label class="form-label">Stock Quantity</label>
                <input
                  v-model="form.stock_quantity"
                  type="number"
                  min="0"
                  class="form-control"
                  placeholder="0"
                  required
                />
              </div>
              
              <div class="mb-3">
                <label class="form-label">Category</label>
                <select
                  v-model="form.category"
                  class="form-select"
                >
                  <option value="General">General</option>
                  <option value="Food">Food</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary flex-grow-1">
                {{ editingProduct ? 'Update' : 'Add Product' }}
              </button>
              <button type="button" class="btn btn-secondary" @click="closeModal">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>