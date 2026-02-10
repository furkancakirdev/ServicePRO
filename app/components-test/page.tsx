'use client'

import { Button } from '@/lib/components/ui/button'
import { Input } from '@/lib/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/lib/components/ui/card'
import { Badge } from '@/lib/components/ui/badge'
import { Checkbox } from '@/lib/components/ui/checkbox'
import { Switch } from '@/lib/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/lib/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/lib/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/lib/components/ui/tabs'
import { Spinner, Skeleton } from '@/lib/components/ui/loading'
import { EmptyState } from '@/lib/components/ui/empty-state'
import { FolderOpen } from 'lucide-react'

export default function ComponentsTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Component Library Test</h1>

      {/* Buttons */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Buttons</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button>Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Inputs */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Inputs</h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Input placeholder="Default input" />
            <Input placeholder="With helper text" helperText="This is helper text" />
            <Input placeholder="Error state" error="This field is required" />
            <Input placeholder="Disabled" disabled />
          </CardContent>
        </Card>
      </section>

      {/* Cards */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Cards</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Title</CardTitle>
              <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Card content</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Simple Card</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Just content</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Badges */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Badges</h2>
        <Card>
          <CardContent className="pt-6 flex flex-wrap gap-4">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge className="bg-green-500 hover:bg-green-600">Success</Badge>
          </CardContent>
        </Card>
      </section>

      {/* Form Elements */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Form Elements</h2>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" />
              <label htmlFor="terms" className="text-sm">Accept terms and conditions</label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="notifications" />
              <label htmlFor="notifications" className="text-sm">Enable notifications</label>
            </div>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </section>

      {/* Table */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Table</h2>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>John Doe</TableCell>
                <TableCell>Admin</TableCell>
                <TableCell><Badge className="bg-green-500 hover:bg-green-600">Active</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Jane Smith</TableCell>
                <TableCell>User</TableCell>
                <TableCell><Badge variant="secondary">Inactive</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Tabs */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Tabs</h2>
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="tab1">
              <TabsList>
                <TabsTrigger value="tab1">Tab 1</TabsTrigger>
                <TabsTrigger value="tab2">Tab 2</TabsTrigger>
                <TabsTrigger value="tab3">Tab 3</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">Content for Tab 1</TabsContent>
              <TabsContent value="tab2">Content for Tab 2</TabsContent>
              <TabsContent value="tab3">Content for Tab 3</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      {/* Loading */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Loading States</h2>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div className="flex items-center gap-4">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
            </div>
            <div className="space-y-2">
              <Skeleton width="60%" height="20px" />
              <Skeleton width="40%" height="20px" />
              <Skeleton width="80%" height="20px" />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Empty State */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Empty State</h2>
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<FolderOpen className="h-12 w-12 text-muted-foreground" />}
              title="No services found"
              description="Get started by creating a new service record"
              action={
                <Button onClick={() => console.log('Create clicked')}>
                  Create Service
                </Button>
              }
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
