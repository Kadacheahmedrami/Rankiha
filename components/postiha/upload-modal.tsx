"use client";
import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ImagePost {
  id: string;
  imageUrl: string;
  title: string;
  upvotes: number;
  downvotes: number;
  createdAt: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (post: ImagePost) => void;
}

export default function UploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
}: UploadModalProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(droppedFile.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, GIF, or WebP image",
        variant: "destructive",
      });
      return;
    }

    if (droppedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setFile(droppedFile);
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(droppedFile);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("tags", "postiha");

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!res.ok) {
      throw new Error("Cloudinary upload failed");
    }

    const data = await res.json();
    return data.secure_url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      toast({
        title: "No image selected",
        description: "Please select an image to upload",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your image",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(30);
      const cloudinaryUrl = await uploadToCloudinary(file);
      setUploadProgress(70);

      const response = await fetch("/api/postiha/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title,
          imgUrl: cloudinaryUrl,
        }),
      });

      setUploadProgress(100);

      if (!response.ok) {
        throw new Error("Failed to save image data");
      }

      const newPost = await response.json();
      toast({
        title: "Upload successful",
        description: "Your image has been uploaded successfully",
      });

      setTitle("");
      setFile(null);
      setPreview(null);
      setUploadProgress(0);
      onUploadSuccess(newPost);
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading your image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setTitle("");
      setFile(null);
      setPreview(null);
      setUploadProgress(0);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-0 shadow-xl bg-gradient-to-b from-background to-secondary/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
            Upload an Image
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">
              Title
            </Label>
            <Input
              id="title"
              placeholder="Enter a title for your image"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border-border/30 bg-secondary/10 focus:border-primary"
              disabled={isUploading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="image" className="text-foreground">
              Image
            </Label>
            <div
              className={`border-2 border-dashed rounded-md p-4 transition-colors ${
                preview
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/30 bg-secondary/10"
              }`}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="relative w-full aspect-video transition-all duration-300">
                  <img
                    src={preview || "/placeholder.svg"}
                    alt="Preview"
                    className="rounded-md object-contain w-full h-full"
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={handleRemoveFile}
                    disabled={isUploading}
                    aria-label="Remove selected image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div className="mt-4 flex flex-col items-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag and drop your image here, or click to browse
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="bg-primary/10 border-primary/30 hover:bg-primary/20 text-foreground"
                    >
                      Select Image
                    </Button>
                    <Input
                      ref={fileInputRef}
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    JPG, PNG, GIF, WebP up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
          {isUploading && (
            <div className="space-y-2">
              <div className="text-sm flex justify-between">
                <span>Upload progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-secondary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-muted-foreground">
                {uploadProgress < 50
                  ? "Uploading to Cloudinary..."
                  : uploadProgress < 100
                  ? "Saving to your database..."
                  : "Upload complete!"}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
              className="border-border/30 hover:bg-secondary/20"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUploading || !file || !title.trim()}
              className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
