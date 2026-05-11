import { useAuth } from '@/contexts/AuthContext'
import { TopBar } from '@/components/TopBar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const { user, gallery, signOut, updateGalleryName } = useAuth()
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(gallery?.name ?? '')

  async function handleSaveName() {
    if (newName.trim()) {
      await updateGalleryName(newName.trim())
      setEditingName(false)
    }
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="mx-auto max-w-[640px] px-4 pt-4 space-y-1">
        {/* Gallery Name */}
        <button
          onClick={() => { setNewName(gallery?.name ?? ''); setEditingName(true) }}
          className="flex w-full items-center justify-between p-3 text-left hover:bg-secondary transition-colors"
        >
          <div>
            <p className="text-sm font-medium">Gallery Name</p>
            <p className="text-sm text-muted-foreground">{gallery?.name || 'Not set'}</p>
          </div>
          <span className="text-xs text-gold/70">Edit</span>
        </button>

        <Separator className="opacity-50" />

        {/* Email */}
        <div className="flex w-full items-center justify-between p-3">
          <div>
            <p className="text-sm font-medium">Email</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Sign Out */}
        <button
          onClick={() => setShowSignOutDialog(true)}
          className="flex w-full items-center p-3 text-left text-destructive hover:bg-secondary transition-colors"
        >
          <p className="text-sm font-medium">Sign Out</p>
        </button>

        <Separator className="opacity-50" />

        {/* App Version */}
        <div className="p-3 pt-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50">GalleryLedger v0.1.0</p>
        </div>
      </div>

      {/* Edit Gallery Name Dialog */}
      <Dialog open={editingName} onOpenChange={setEditingName}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Gallery Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="galleryName">Gallery name</Label>
            <Input
              id="galleryName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={100}
              className="h-11 bg-card border-border/60"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingName(false)}>Cancel</Button>
            <Button onClick={handleSaveName} disabled={!newName.trim()} className="bg-gold text-gold-foreground hover:bg-gold/90">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign out?</DialogTitle>
            <DialogDescription>You can sign back in anytime to access your gallery.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={signOut}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
