'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageUploadField } from '@/components/admin/image-upload-field';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/hooks/use-resource';
import { useSiteSettings, useUpdateSiteSettings } from '@/hooks/use-site-settings';
import { useHasPermission } from '@/hooks/use-permission';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const;

const websiteSchema = z.object({
  siteNameEn: z.string().min(1, 'Required').max(200),
  taglineEn: z.string().max(300).optional().or(z.literal('')),
  logoUrl: z.string().optional().or(z.literal('')),
  faviconUrl: z.string().optional().or(z.literal('')),
  contactAddressEn: z.string().max(500).optional().or(z.literal('')),
  contactPhone: z.string().max(30).optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactHoursEn: z.string().max(200).optional().or(z.literal('')),
  whatsappNumber: z.string().max(30).optional().or(z.literal('')),
  footerTextEn: z.string().max(1000).optional().or(z.literal('')),
  copyrightText: z.string().max(300).optional().or(z.literal('')),
  maintenanceMode: z.boolean(),
  bankAccountName: z.string().max(200).optional().or(z.literal('')),
  bankAccountNumber: z.string().max(50).optional().or(z.literal('')),
  bankIfscCode: z.string().max(20).optional().or(z.literal('')),
  bankName: z.string().max(200).optional().or(z.literal('')),
  bankBranch: z.string().max(200).optional().or(z.literal('')),
  upiId: z.string().max(100).optional().or(z.literal('')),
  upiQrImageUrl: z.string().optional().or(z.literal('')),
});
type WebsiteFormValues = z.infer<typeof websiteSchema>;

const seoSchema = z.object({
  defaultMetaTitle: z.string().max(200).optional().or(z.literal('')),
  defaultMetaDescription: z.string().max(500).optional().or(z.literal('')),
  defaultOgImageUrl: z.string().optional().or(z.literal('')),
});
type SeoFormValues = z.infer<typeof seoSchema>;

function WebsiteSettingsTab() {
  const canManage = useHasPermission('settings:manage');
  const { data, isLoading } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const form = useForm<WebsiteFormValues>({
    resolver: zodResolver(websiteSchema),
    defaultValues: {
      siteNameEn: '',
      taglineEn: '',
      logoUrl: '',
      faviconUrl: '',
      contactAddressEn: '',
      contactPhone: '',
      contactEmail: '',
      contactHoursEn: '',
      whatsappNumber: '',
      footerTextEn: '',
      copyrightText: '',
      maintenanceMode: false,
      bankAccountName: '',
      bankAccountNumber: '',
      bankIfscCode: '',
      bankName: '',
      bankBranch: '',
      upiId: '',
      upiQrImageUrl: '',
    },
  });
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (data && !hydrated.current) {
      form.reset({
        siteNameEn: data.siteNameEn,
        taglineEn: data.taglineEn ?? '',
        logoUrl: data.logoUrl ?? '',
        faviconUrl: data.faviconUrl ?? '',
        contactAddressEn: data.contactAddressEn ?? '',
        contactPhone: data.contactPhone ?? '',
        contactEmail: data.contactEmail ?? '',
        contactHoursEn: data.contactHoursEn ?? '',
        whatsappNumber: data.whatsappNumber ?? '',
        footerTextEn: data.footerTextEn ?? '',
        copyrightText: data.copyrightText ?? '',
        maintenanceMode: data.maintenanceMode,
        bankAccountName: data.bankAccountName ?? '',
        bankAccountNumber: data.bankAccountNumber ?? '',
        bankIfscCode: data.bankIfscCode ?? '',
        bankName: data.bankName ?? '',
        bankBranch: data.bankBranch ?? '',
        upiId: data.upiId ?? '',
        upiQrImageUrl: data.upiQrImageUrl ?? '',
      });
      hydrated.current = true;
    }
  }, [data, form]);

  function onSubmit(values: WebsiteFormValues) {
    const payload = {
      ...values,
      taglineEn: values.taglineEn || undefined,
      logoUrl: values.logoUrl || undefined,
      faviconUrl: values.faviconUrl || undefined,
      contactAddressEn: values.contactAddressEn || undefined,
      contactPhone: values.contactPhone || undefined,
      contactEmail: values.contactEmail || undefined,
      contactHoursEn: values.contactHoursEn || undefined,
      whatsappNumber: values.whatsappNumber || undefined,
      footerTextEn: values.footerTextEn || undefined,
      copyrightText: values.copyrightText || undefined,
      bankAccountName: values.bankAccountName || undefined,
      bankAccountNumber: values.bankAccountNumber || undefined,
      bankIfscCode: values.bankIfscCode || undefined,
      bankName: values.bankName || undefined,
      bankBranch: values.bankBranch || undefined,
      upiId: values.upiId || undefined,
      upiQrImageUrl: values.upiQrImageUrl || undefined,
    };
    updateMutation
      .mutateAsync(payload)
      .then(() => toast.success('Website settings saved'))
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Site name, tagline, logo, and favicon.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="siteNameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taglineEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!canManage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="faviconUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Favicon</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!canManage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
            <CardDescription>Shown in the site footer and the public Contact page.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="contactAddressEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="contactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (optional)</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="whatsappNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>WhatsApp number (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="contactHoursEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Office hours (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Mon–Sat, 9am–6pm" disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank transfer &amp; UPI details</CardTitle>
            <CardDescription>
              Shown on the public Donate page for manual bank transfers — left blank hides that
              section entirely rather than showing placeholder details.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="bankAccountName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankAccountNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account number (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="bankIfscCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC code (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank name (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bankBranch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="upiId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI ID (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="ashram@upi" disabled={!canManage} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="upiQrImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UPI QR code image (optional)</FormLabel>
                    <FormControl>
                      <ImageUploadField
                        value={field.value}
                        onChange={field.onChange}
                        disabled={!canManage}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Footer &amp; maintenance</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="footerTextEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer text (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="copyrightText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Copyright text (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maintenanceMode"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Maintenance mode</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {canManage && (
          <Button type="submit" className="w-fit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="animate-spin" />} Save website settings
          </Button>
        )}
      </form>
    </Form>
  );
}

function SeoSettingsTab() {
  const canManage = useHasPermission('settings:manage');
  const { data, isLoading } = useSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoSchema),
    defaultValues: { defaultMetaTitle: '', defaultMetaDescription: '', defaultOgImageUrl: '' },
  });
  const hydrated = React.useRef(false);

  React.useEffect(() => {
    if (data && !hydrated.current) {
      form.reset({
        defaultMetaTitle: data.defaultMetaTitle ?? '',
        defaultMetaDescription: data.defaultMetaDescription ?? '',
        defaultOgImageUrl: data.defaultOgImageUrl ?? '',
      });
      hydrated.current = true;
    }
  }, [data, form]);

  function onSubmit(values: SeoFormValues) {
    const payload = {
      defaultMetaTitle: values.defaultMetaTitle || undefined,
      defaultMetaDescription: values.defaultMetaDescription || undefined,
      defaultOgImageUrl: values.defaultOgImageUrl || undefined,
    };
    updateMutation
      .mutateAsync(payload)
      .then(() => toast.success('SEO settings saved'))
      .catch((error) => toast.error(apiErrorMessage(error)));
  }

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Default SEO metadata</CardTitle>
            <CardDescription>
              Used as a fallback when a specific page doesn&rsquo;t set its own meta
              title/description.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="defaultMetaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default meta title (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultMetaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default meta description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} disabled={!canManage} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultOgImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default social share image (optional)</FormLabel>
                  <FormControl>
                    <ImageUploadField
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!canManage}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {canManage && (
          <Button type="submit" className="w-fit" disabled={updateMutation.isPending}>
            {updateMutation.isPending && <Loader2 className="animate-spin" />} Save SEO settings
          </Button>
        )}
      </form>
    </Form>
  );
}

function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how the admin dashboard looks on this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {THEME_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={mounted && theme === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account security</CardTitle>
          <CardDescription>Password and active session management.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" render={<Link href="/admin/profile#security" />}>
            Manage on Profile page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsBody() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = ['preferences', 'website', 'seo'].includes(tabParam ?? '')
    ? tabParam!
    : 'preferences';

  return (
    <div className="max-w-3xl">
      <div className={cn('mb-6')}>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm">
          Personal preferences, website settings, and SEO defaults.
        </p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="website">Website</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="preferences">
          <PreferencesTab />
        </TabsContent>
        <TabsContent value="website">
          <WebsiteSettingsTab />
        </TabsContent>
        <TabsContent value="seo">
          <SeoSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-3xl" />}>
      <SettingsBody />
    </Suspense>
  );
}
