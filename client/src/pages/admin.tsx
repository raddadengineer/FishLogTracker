import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, UserCheck, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/layout/Layout";

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminSetupStatus, setAdminSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Check if current user is admin
  useEffect(() => {
    if (!isLoading && user) {
      setIsAdmin(user.role === 'admin' || user.role === 'moderator');
    }
  }, [user, isLoading]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  // Fetch users for admin dashboard
  const { data: users = [], isLoading: isUsersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      if (!isAdmin) return [];
      try {
        const response = await apiRequest('/api/admin/users', { method: 'GET' });
        return response.json();
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
    enabled: isAdmin,
  });

  // Setup admin account if none exists
  const handleSetupAdmin = async () => {
    setAdminSetupStatus('loading');
    try {
      const response = await apiRequest('/api/admin/setup', { method: 'POST' });
      if (response.ok) {
        setAdminSetupStatus('success');
        // Refetch the current user to update role
        window.location.reload();
      } else {
        setAdminSetupStatus('error');
        console.error('Failed to setup admin:', await response.text());
      }
    } catch (error) {
      setAdminSetupStatus('error');
      console.error('Error setting up admin:', error);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-lg">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (!isAdmin && adminSetupStatus === 'idle') {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-bold">Admin Setup</CardTitle>
              <CardDescription>
                No admin account has been set up yet. Would you like to make yourself an admin?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                As an admin, you'll be able to:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                <li>Manage users and moderate content</li>
                <li>Verify fish catches</li>
                <li>Add and manage lake data</li>
                <li>Access usage statistics</li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSetupAdmin} 
                disabled={adminSetupStatus === 'loading'}
                className="w-full"
              >
                {adminSetupStatus === 'loading' ? 'Setting up...' : 'Make me an admin'}
              </Button>
            </CardFooter>
          </Card>
          
          {adminSetupStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <p>Admin account created successfully! Please refresh the page.</p>
            </div>
          )}
          
          {adminSetupStatus === 'error' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <p>Failed to create admin account. An admin may already exist.</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Shield className="h-6 w-6" /> Admin Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {isUsersLoading ? "..." : users.length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Unverified Catches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-amber-500" />
                0
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Active Moderators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold flex items-center gap-2">
                <UserCheck className="h-6 w-6 text-secondary" />
                {isUsersLoading ? "..." : users.filter(u => u.role === 'moderator').length}
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage user roles and permissions</CardDescription>
          </CardHeader>
          <CardContent>
            {isUsersLoading ? (
              <div className="text-center py-8">Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-xs">{user.id}</TableCell>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={
                          user.role === 'admin' ? 'destructive' : 
                          user.role === 'moderator' ? 'default' : 'outline'
                        }>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}