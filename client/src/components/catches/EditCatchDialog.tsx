import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CatchForm from "./CatchForm";

interface EditCatchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  catchData: any;
}

export function EditCatchDialog({ isOpen, onClose, catchData }: EditCatchDialogProps) {
  // Handle successful form submission
  const handleSuccess = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Catch</DialogTitle>
          <DialogDescription>
            Update the details of your catch
          </DialogDescription>
        </DialogHeader>
        
        {catchData && (
          <CatchForm 
            catchToEdit={catchData} 
            onSuccess={handleSuccess} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}