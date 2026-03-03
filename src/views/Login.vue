<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })
    
    if (authError) throw authError
    
    router.push('/')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-vh-100 d-flex align-items-center justify-content-center bg-light">
    <div class="container">
      <div class="row justify-content-center">
        <div class="col-md-6 col-lg-5">
          <div class="card shadow-lg border-0">
            <div class="card-body p-5">
              <div class="text-center mb-4">
                <h1 class="h3 fw-bold text-primary">Mini POS</h1>
                <p class="text-muted">Sign in to continue</p>
              </div>
              
              <div v-if="error" class="alert alert-danger" role="alert">
                {{ error }}
              </div>
              
              <form @submit.prevent="handleLogin">
                <div class="mb-3">
                  <label class="form-label fw-semibold">Email</label>
                  <input
                    v-model="email"
                    type="email"
                    class="form-control form-control-lg"
                    placeholder="Enter your email"
                    required
                  />
                </div>
                
                <div class="mb-4">
                  <label class="form-label fw-semibold">Password</label>
                  <input
                    v-model="password"
                    type="password"
                    class="form-control form-control-lg"
                    placeholder="Enter your password"
                    required
                  />
                </div>
                
                <div class="d-grid">
                  <button
                    type="submit"
                    class="btn btn-primary btn-lg"
                    :disabled="loading"
                  >
                    <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                    {{ loading ? 'Signing in...' : 'Sign In' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <p class="text-center text-muted mt-3 small">
            Mini POS v1.0 - Point of Sale System
          </p>
        </div>
      </div>
    </div>
  </div>
</template>