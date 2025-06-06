import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Shield, UserCheck, Users, Filter, Eye, Edit, Trash2, Check, Download, Upload, Database, FileText, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getFishSpeciesById } from "@/lib/fishSpecies";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [adminSetupStatus, setAdminSetupStatus] = useState<string>('idle');
  const [userRoleEdit, setUserRoleEdit] = useState<{id: string, role: string} | null>(null);
  const [selectedCatchId, setSelectedCatchId] = useState<number | null>(null);
  const [catchDetailsOpen, setCatchDetailsOpen] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('idle');
  const [importStatus, setImportStatus] = useState<string>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch users for admin dashboard
  const { data: users = [], isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        // Include user credentials and role in request headers
        const response = await fetch('/api/admin/users', {
          headers: {
            'x-auth-user-id': (user as any)?.id || '',
            'x-auth-user-role': (user as any)?.role || ''
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch users:', error);
        return [];
      }
    },
    enabled: !!user && (user as any)?.role === 'admin',
  });
  
  // Fetch all catches for admin review
  const { data: allCatches = [], isLoading: isCatchesLoading } = useQuery({
    queryKey: ['/api/catches'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/catches?limit=100', {
          headers: {
            'x-auth-user-id': (user as any)?.id || '',
            'x-auth-user-role': (user as any)?.role || ''
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch catches');
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch catches:', error);
        return [];
      }
    },
    enabled: !!user && (user as any)?.role === 'admin',
  });

  // Count unverified catches
  const unverifiedCatches = allCatches.filter((c: any) => !c.isVerified);
  
  // Count moderators
  const moderators = users.filter((u: any) => u.role === 'moderator' || u.role === 'admin').length;
  
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
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
        headers: {
          'Content-Type': 'application/json',
          'x-auth-user-id': (user as any)?.id || '',
          'x-auth-user-role': (user as any)?.role || ''
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify catch');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/catches'] });
      toast({
        title: 'Success',
        description: 'Catch verified successfully',
      });
      setCatchDetailsOpen(false);
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
      setCatchDetailsOpen(false);
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

  // Database export mutation
  const exportDatabaseMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/export', {
        method: 'GET',
        headers: {
          'x-auth-user-id': (user as any)?.id || '',
          'x-auth-user-role': (user as any)?.role || ''
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export database');
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fish-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setExportStatus('success');
      toast({
        title: 'Success',
        description: 'Database exported successfully',
      });
    },
    onError: (error) => {
      setExportStatus('error');
      toast({
        title: 'Error',
        description: `Failed to export database: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Database import mutation
  const importDatabaseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('backup', file);
      
      const response = await fetch('/api/admin/import', {
        method: 'POST',
        headers: {
          'x-auth-user-id': (user as any)?.id || '',
          'x-auth-user-role': (user as any)?.role || ''
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import database');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setImportStatus('success');
      queryClient.invalidateQueries();
      toast({
        title: 'Success',
        description: `Database imported successfully. Restored ${data.recordsImported} records.`,
      });
    },
    onError: (error) => {
      setImportStatus('error');
      toast({
        title: 'Error',
        description: `Failed to import database: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle database export
  const handleExportDatabase = () => {
    setExportStatus('loading');
    exportDatabaseMutation.mutate();
  };

  // Handle database import
  const handleImportDatabase = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection for import
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        toast({
          title: 'Error',
          description: 'Please select a valid JSON backup file',
          variant: 'destructive',
        });
        return;
      }
      
      setImportStatus('loading');
      importDatabaseMutation.mutate(file);
    }
    
    // Reset the input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Setup admin account if none exists
  const handleSetupAdmin = async () => {
    setAdminSetupStatus('loading');
    try {
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create admin account');
      }
      
      setAdminSetupStatus('success');
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch (error) {
      console.error('Error creating admin account:', error);
      setAdminSetupStatus('error');
    }
  };

  // Selected catch details
  const selectedCatch = allCatches.find((c: any) => c.id === selectedCatchId);

  // If user is not an admin, show admin setup button
  if (user && (user as any)?.role !== 'admin') {
    return (
      <div className="container max-w-6xl mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Admin Access Required</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Become an Admin</CardTitle>
            <CardDescription>
              You need admin privileges to access this page. If no admin exists yet, you can create the first admin account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSetupAdmin} 
              disabled={adminSetupStatus === 'loading'}
            >
              {adminSetupStatus === 'loading' ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4 animate-spin" />
                  Creating Admin...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Create Admin Account
                </>
              )}
            </Button>
          </CardContent>
          
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
        </Card>
      </div>
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
            <TabsTrigger value="data">Data Management</TabsTrigger>
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
                                  defaultValue={user.role || 'user'}
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
                                  {user.role || 'user'}
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
                                  onClick={() => setUserRoleEdit({ id: user.id, role: user.role || 'user' })}
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
                              <TableCell>#{catchItem.id}</TableCell>
                              <TableCell>{speciesInfo?.name || catchItem.species}</TableCell>
                              <TableCell>{catchItem.user?.username || 'Unknown'}</TableCell>
                              <TableCell>
                                {typeof catchItem.size === 'number' 
                                  ? catchItem.size.toFixed(1) 
                                  : typeof catchItem.size === 'string'
                                    ? parseFloat(catchItem.size).toFixed(1)
                                    : 'N/A'}
                              </TableCell>
                              <TableCell>{formatDate(catchItem.catchDate)}</TableCell>
                              <TableCell>
                                {catchItem.isVerified ? (
                                  <Badge className="bg-green-500 hover:bg-green-600">Verified</Badge>
                                ) : (
                                  <Badge variant="outline">Pending</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-2 justify-end">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => {
                                      setSelectedCatchId(catchItem.id);
                                      setCatchDetailsOpen(true);
                                    }}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  
                                  {!catchItem.isVerified && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      onClick={() => handleVerifyCatch(catchItem.id)}
                                    >
                                      <Check className="h-4 w-4 text-green-500" />
                                    </Button>
                                  )}
                                  
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteCatch(catchItem.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
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
            
            {/* Catch Details Dialog */}
            <Dialog open={catchDetailsOpen} onOpenChange={setCatchDetailsOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Catch Details</DialogTitle>
                  <DialogDescription>
                    Review catch submission details
                  </DialogDescription>
                </DialogHeader>
                
                {selectedCatch && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">Species:</div>
                      <div>{getFishSpeciesById(selectedCatch.species)?.name || selectedCatch.species}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">Size:</div>
                      <div>{selectedCatch.size} inches</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">Weight:</div>
                      <div>{selectedCatch.weight ? `${selectedCatch.weight} lbs` : 'Not recorded'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">Lake:</div>
                      <div>{selectedCatch.lake?.name || 'Not specified'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">Date:</div>
                      <div>{formatDate(selectedCatch.catchDate)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="font-semibold">User:</div>
                      <div>{selectedCatch.user?.username || 'Unknown'}</div>
                    </div>
                    {selectedCatch.comments && (
                      <div className="mt-2">
                        <div className="font-semibold">Comments:</div>
                        <div className="mt-1 text-sm border p-2 rounded-md bg-muted">
                          {selectedCatch.comments}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <DialogFooter className="flex justify-between">
                  {selectedCatch && !selectedCatch.isVerified && (
                    <Button onClick={() => handleVerifyCatch(selectedCatch.id)} className="mr-auto">
                      <Check className="mr-2 h-4 w-4" />
                      Verify Catch
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => selectedCatch && handleDeleteCatch(selectedCatch.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
          
          {/* Data Management Tab */}
          <TabsContent value="data">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Database Export */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    Export Database
                  </CardTitle>
                  <CardDescription>
                    Download a complete backup of all application data including users, catches, lakes, and comments.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Database className="h-4 w-4" />
                      <span>Includes all tables and relationships</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Downloaded as JSON format</span>
                    </div>
                    <Button 
                      onClick={handleExportDatabase}
                      disabled={exportStatus === 'loading'}
                      className="w-full"
                    >
                      {exportStatus === 'loading' ? (
                        <>
                          <Download className="mr-2 h-4 w-4 animate-pulse" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Export Database
                        </>
                      )}
                    </Button>
                    
                    {exportStatus === 'success' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                        <CheckCircle className="h-4 w-4" />
                        <span>Database exported successfully!</span>
                      </div>
                    )}
                    
                    {exportStatus === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to export database</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Database Import */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Import Database
                  </CardTitle>
                  <CardDescription>
                    Restore data from a previously exported backup file. This will replace existing data.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Warning: This will overwrite existing data</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>Accepts JSON backup files only</span>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    <Button 
                      onClick={handleImportDatabase}
                      disabled={importStatus === 'loading'}
                      variant="outline"
                      className="w-full"
                    >
                      {importStatus === 'loading' ? (
                        <>
                          <Upload className="mr-2 h-4 w-4 animate-pulse" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Select Backup File
                        </>
                      )}
                    </Button>
                    
                    {importStatus === 'success' && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded">
                        <CheckCircle className="h-4 w-4" />
                        <span>Database imported successfully!</span>
                      </div>
                    )}
                    
                    {importStatus === 'error' && (
                      <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <AlertCircle className="h-4 w-4" />
                        <span>Failed to import database</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Info */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Important Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>Export data regularly to prevent loss during app rebuilds or updates</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>Backup files contain all user data, catches, and system information</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>Import will completely replace existing data - use with caution</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold">•</span>
                    <span>Files are downloaded with timestamp: fish-tracker-backup-YYYY-MM-DD.json</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}