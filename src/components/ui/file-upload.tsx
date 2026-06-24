import * as React from "react"
import { ImageIcon } from "lucide-react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type FileUploadProps = Omit<React.ComponentProps<"input">, "type" | "children"> & {
  title: string
  description?: string
  previewUrl?: string | null
  previewAlt?: string
}

function FileUpload({ className, title, description, previewUrl, previewAlt = "Upload preview", ...props }: FileUploadProps) {
  return (
    <label className={cn("grid min-h-56 cursor-pointer place-items-center overflow-hidden rounded-3xl border border-dashed bg-input/30 text-center text-sm text-muted-foreground transition hover:bg-input/50", className)}>
      {previewUrl ? (
        <img src={previewUrl} alt={previewAlt} className="aspect-[4/5] max-h-72 w-full object-cover" />
      ) : (
        <span className="grid gap-2 px-6">
          <ImageIcon className="mx-auto size-9 text-primary" />
          <strong className="text-base text-foreground">{title}</strong>
          {description && <span>{description}</span>}
        </span>
      )}
      <Input className="sr-only" type="file" {...props} />
    </label>
  )
}

export { FileUpload }
