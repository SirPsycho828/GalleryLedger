import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut as firebaseSignOut, sendPasswordResetEmail, type User } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit, doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import type { Gallery } from '@/types'

interface AuthContextType {
  user: User | null
  gallery: Gallery | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateGalleryName: (name: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [gallery, setGallery] = useState<Gallery | null>(null)
  const [loading, setLoading] = useState(true)

  // Load gallery for authenticated user
  async function loadGallery(uid: string) {
    const q = query(
      collection(db, 'galleries'),
      where('ownerId', '==', uid),
      limit(1)
    )
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0]
      setGallery({ id: docSnap.id, ...docSnap.data() } as Gallery)
    } else {
      setGallery(null)
    }
  }

  // Create gallery for new user
  async function createGallery(uid: string): Promise<void> {
    try {
      const docRef = await addDoc(collection(db, 'galleries'), {
        ownerId: uid,
        name: '',
        createdAt: serverTimestamp(),
      })
      setGallery({
        id: docRef.id,
        ownerId: uid,
        name: '',
        createdAt: null as any,
      })
    } catch {
      // Retry once
      const docRef = await addDoc(collection(db, 'galleries'), {
        ownerId: uid,
        name: '',
        createdAt: serverTimestamp(),
      })
      setGallery({
        id: docRef.id,
        ownerId: uid,
        name: '',
        createdAt: null as any,
      })
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        await loadGallery(firebaseUser.uid)
      } else {
        setGallery(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  async function signUp(email: string, password: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    await createGallery(credential.user.uid)
  }

  async function signIn(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password)
  }

  async function signOut() {
    await firebaseSignOut(auth)
    setGallery(null)
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email)
  }

  async function updateGalleryName(name: string) {
    if (!gallery) return
    const galleryRef = doc(db, 'galleries', gallery.id)
    await updateDoc(galleryRef, { name })
    setGallery({ ...gallery, name })
  }

  return (
    <AuthContext.Provider value={{ user, gallery, loading, signUp, signIn, signOut, resetPassword, updateGalleryName }}>
      {children}
    </AuthContext.Provider>
  )
}
