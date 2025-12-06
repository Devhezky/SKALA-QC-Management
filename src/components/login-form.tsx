
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GalleryVerticalEnd, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      toast({
        title: "Login successful",
        description: "Welcome back!",
      })
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={onSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex size-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GalleryVerticalEnd className="size-6" />
            </div>
            <h1 className="text-2xl font-bold">Narapati Studio QC</h1>
            <FieldDescription>
              Enter your Perfex CRM credentials to login
            </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="staff@narapatistudio.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <a
                href="#"
                className="text-sm text-muted-foreground hover:underline"
                onClick={(e) => {
                  e.preventDefault()
                  toast({
                    title: "Forgot password?",
                    description: "Please contact admin to reset password",
                  })
                }}
              >
                Forgot password?
              </a>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </Field>
          <Field>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Login
            </Button>
          </Field>
          <FieldSeparator>Or</FieldSeparator>
          <Field>
            <Button
              variant="outline"
              type="button"
              className="w-full bg-[#002D74] text-white hover:bg-[#002D74]/90 hover:text-white"
              onClick={() => {
                const width = 600;
                const height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const skalaUrl = 'https://skala.narapatistudio.com';
                const ssoUrl = `${skalaUrl}/admin/qc_integration/qc_sso/login?popup=1`;

                window.open(
                  ssoUrl,
                  'SkalaLogin',
                  `width=${width},height=${height},left=${left},top=${top}`
                );

                const handleMessage = (event: MessageEvent) => {
                  if (event.origin !== window.location.origin) return;

                  if (event.data?.type === 'SKALA_LOGIN_SUCCESS') {
                    window.removeEventListener('message', handleMessage);
                    toast({
                      title: "Login successful",
                      description: "Welcome back!",
                    })
                    router.push("/dashboard");
                    router.refresh();
                  }
                };

                window.addEventListener('message', handleMessage);
              }}
            >
              Login with SKALA
            </Button>
          </Field>
        </FieldGroup>
      </form>
      <FieldDescription className="px-6 text-center">
        By logging in, you agree to our internal <a href="#">Security Policy</a>.
      </FieldDescription>
    </div>
  )
}

