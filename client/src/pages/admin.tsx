import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, UserCheck, Users, Filter, Eye, Edit, Trash2, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getFishSpeciesById } from "@/lib/fishSpecies";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminSetupStatus, setAdminSetupStatus] = useState<string>('idle');
  const [userRoleEdit, setUserRoleEdit] = useState<{id: string, role: string} | null>(null);
  const [selectedCatchId, setSelectedCatchId] = useState<number | null>(null);

  // Fetch users for admin dashboard
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
    enabled: !!user && user.role === 'admin',
  });
  
  // Fetch all catches for admin review
  const { data: allCatches = [], isLoading: isCatchesLoading } = useQuery({
    queryKey: ['/api/catches'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/catches?limit=100');
        if (!response.ok) {
          throw new Error('Failed to fetch catches');
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch catches:', error);
        return [];
      }
    },
    enabled: !!user && user.role === 'admin',
  });

  // Count unverified catches
  const unverifiedCatches = allCatches.filter(c => !c.isVerified);
  
  // Count moderators
  const moderators = users.filter(u => u.role === 'moderator' || u.role === 'admin').length;
  
  // Setup admin user role change mutation
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });
      setUserRoleEdit(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update user role: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Setup catch verification mutation
  const verifyCatchMutation = useMutation({
    mutationFn: async (catchId: number) => {
      const response = await fetch(`/api/admin/catches/${catchId}/verify`, {
        method: 'PATCH',
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify catch');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catches'] });
      toast({
        title: 'Success',
        description: 'Catch verified successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to verify catch: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Setup catch deletion mutation
  const deleteCatchMutation = useMutation({
    mutationFn: async (catchId: number) => {
      const response = await fetch(`/api/catches/${catchId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete catch');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catches'] });
      toast({
        title: 'Success',
        description: 'Catch deleted successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete catch: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle user role change
  const handleRoleChange = (userId: string, role: string) => {
    updateUserRoleMutation.mutate({ userId, role });
  };
  
  // Handle catch verification
  const handleVerifyCatch = (catchId: number) => {
    verifyCatchMutation.mutate(catchId);
  };
  
  // Handle catch deletion
  const handleDeleteCatch = (catchId: number) => {
    deleteCatchMutation.mutate(catchId);
  };

  // Setup admin account if none exists
  const handleSetupAdmin = async () => {
    setAdminSetupStatus('loading');
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        setAdminSetupStatus('success');
        // Reload to update role
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

  // If user is not admin but no admin exists yet, show the admin setup page
  if (user && user.role !== 'admin' && adminSetupStatus === 'idle') {
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
    <ProtectedRoute adminOnly>
      <div className="container max-w-6xl mx-auto py-6">
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
                {isCatchesLoading ? "..." : unverifiedCatches.length}
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
                {isUsersLoading ? "..." : moderators}
              </div>
            </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="users" className="w-full mt-6">
            <TabsList className="mb-4">
              <TabsTrigger value="users">User Management</TabsTrigger>
              <TabsTrigger value="catches">Catch Verification</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
            </TabsList>
            
            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>View and manage users in the system</CardDescription>
                </CardHeader>
                <CardContent>
                  {isUsersLoading ? (
                    <div className="flex justify-center items-center p-8">
                      <AlertTriangle className="h-6 w-6 animate-pulse" />
                      <span className="ml-2">Loading users...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Username</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-mono text-xs">{user.id.substring(0, 8)}...</TableCell>
                              <TableCell className="font-medium">{user.username}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                {userRoleEdit?.id === user.id ? (
                                  <Select 
                                    defaultValue={user.role}
                                    onValueChange={(value) => handleRoleChange(user.id, value)}
                                  >
                                    <SelectTrigger className="w-28">
                                      <SelectValue placeholder="Select role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">User</SelectItem>
                                      <SelectItem value="moderator">Moderator</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge 
                                    variant={user.role === 'admin' ? 'destructive' : 
                                             user.role === 'moderator' ? 'outline' : 'default'}
                                  >
                                    {user.role}
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(user.createdAt)}</TableCell>
                              <TableCell className="text-right">
                                {userRoleEdit?.id === user.id ? (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setUserRoleEdit(null)}
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => setUserRoleEdit({ id: user.id, role: user.role })}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Catches Tab */}
            <TabsContent value="catches">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Catch Management</CardTitle>
                  <CardDescription>Verify and moderate catch submissions</CardDescription>
                </CardHeader>
                <CardContent>
                  {isCatchesLoading ? (
                    <div className="flex justify-center items-center p-8">
                      <AlertTriangle className="h-6 w-6 animate-pulse" />
                      <span className="ml-2">Loading catches...</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Species</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Size (in)</TableHead>
                            <TableHead>Caught On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allCatches.map((catchItem: any) => {
                            const speciesInfo = getFishSpeciesById(catchItem.species);
                            return (
                              <TableRow key={catchItem.id}>
                                <TableCell>{catchItem.id}</TableCell>
                                <TableCell className="font-medium">
                                  {speciesInfo?.name || catchItem.species}
                                </TableCell>
                                <TableCell>{catchItem.user?.username || 'Unknown'}</TableCell>
                                <TableCell>{catchItem.size}</TableCell>
                                <TableCell>{formatDate(catchItem.catchDate)}</TableCell>
                                <TableCell>
                                  {catchItem.isVerified ? (
                                    <Badge variant="success" className="bg-green-100 text-green-800">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Verified
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                                      <AlertTriangle className="h-3 w-3 mr-1" /> Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => setSelectedCatchId(catchItem.id)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    
                                    {!catchItem.isVerified && (
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => handleVerifyCatch(catchItem.id)}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    )}
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                      onClick={() => handleDeleteCatch(catchItem.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Stats Tab */}
            <TabsContent value="stats">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Platform Statistics</CardTitle>
                  <CardDescription>Overview of platform activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">Species Breakdown</h3>
                      <div className="text-sm text-muted-foreground">
                        {isCatchesLoading ? (
                          <p>Loading species data...</p>
                        ) : (
                          <div className="space-y-2">
                            {Object.entries(
                              allCatches.reduce((acc: any, catchItem: any) => {
                                const species = getFishSpeciesById(catchItem.species)?.name || catchItem.species;
                                acc[species] = (acc[species] || 0) + 1;
                                return acc;
                              }, {})
                            ).map(([species, count]: [string, any]) => (
                              <div key={species} className="flex justify-between items-center">
                                <span>{species}</span>
                                <Badge variant="outline">{count}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">Recent Activity</h3>
                      <div className="text-sm text-muted-foreground">
                        {isCatchesLoading ? (
                          <p>Loading activity data...</p>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span>Catches today</span>
                              <Badge variant="outline">
                                {allCatches.filter((c: any) => {
                                  const today = new Date();
                                  const catchDate = new Date(c.catchDate);
                                  return catchDate.toDateString() === today.toDateString();
                                }).length}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Catches this week</span>
                              <Badge variant="outline">
                                {allCatches.filter((c: any) => {
                                  const catchDate = new Date(c.catchDate);
                                  const today = new Date();
                                  const oneWeekAgo = new Date();
                                  oneWeekAgo.setDate(today.getDate() - 7);
                                  return catchDate >= oneWeekAgo;
                                }).length}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>New users this week</span>
                              <Badge variant="outline">
                                {users.filter((u: any) => {
                                  const joinDate = new Date(u.createdAt);
                                  const today = new Date();
                                  const oneWeekAgo = new Date();
                                  oneWeekAgo.setDate(today.getDate() - 7);
                                  return joinDate >= oneWeekAgo;
                                }).length}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
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
                    {users.map((user: any) => (
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
      </ProtectedRoute>
    </Layout>
  );
}