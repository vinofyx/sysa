'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import type { AxiosError } from 'axios';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FileUploadField } from '@/components/admin/file-upload-field';
import { publicApiClient } from '@/lib/public-api';

interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

const schema = z.object({
  name: z.string().min(1, 'Required').max(150),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Required').max(20),
  type: z.enum(['volunteer', 'internship']),
  areaOfInterest: z.string().max(500).optional().or(z.literal('')),
  academicBackground: z.string().max(1000).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

const EMPTY_VALUES: FormValues = {
  name: '',
  email: '',
  phone: '',
  type: 'volunteer',
  areaOfInterest: '',
  academicBackground: '',
};

export function VolunteerForm() {
  const t = useTranslations('Volunteer');
  const tForms = useTranslations('Forms');
  const tCommon = useTranslations('Common');
  const [resume, setResume] = React.useState<File | null>(null);
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_VALUES });
  const type = form.watch('type');

  const submitMutation = useMutation<void, AxiosError<ApiErrorBody>, FormValues>({
    mutationFn: async (values) => {
      let resumeUrl: string | undefined;
      if (resume) {
        const formData = new FormData();
        formData.append('file', resume);
        const { data } = await publicApiClient.post<{ url: string }>(
          '/media/upload/resume',
          formData,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
          },
        );
        resumeUrl = data.url;
      }
      await publicApiClient.post('/volunteers/register', {
        ...values,
        areaOfInterest: values.areaOfInterest || undefined,
        academicBackground: values.academicBackground || undefined,
        resumeUrl,
      });
    },
    onSuccess: () => setSubmitted(true),
  });

  if (submitted) {
    return (
      <div className="border-pub-primary-100 bg-pub-primary-100 flex flex-col items-center gap-3 rounded-xl border p-10 text-center">
        <CheckCircle2 className="text-pub-primary-700 size-10" />
        <p className="font-pub-heading text-pub-primary-900 text-lg font-semibold">
          {t('successMessage')}
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => submitMutation.mutate(values))}
        className="flex flex-col gap-5"
      >
        <div className="grid grid-cols-2 gap-3 rounded-lg border p-1">
          {(['volunteer', 'internship'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => form.setValue('type', option)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                type === option ? 'bg-pub-primary-700 text-white' : 'text-pub-neutral-500'
              }`}
            >
              {option === 'volunteer' ? t('typeVolunteer') : t('typeInternship')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('name')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={tForms('namePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tForms('phone')}</FormLabel>
                <FormControl>
                  <Input {...field} placeholder={tForms('phonePlaceholder')} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tForms('email')}</FormLabel>
              <FormControl>
                <Input type="email" {...field} placeholder={tForms('emailPlaceholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="areaOfInterest"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('areaOfInterest')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === 'internship' && (
          <>
            <FormField
              control={form.control}
              name="academicBackground"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('academicBackground')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div>
              <label className="mb-2 block text-sm font-medium">{t('resume')}</label>
              <FileUploadField value={resume} onChange={setResume} accept="application/pdf" />
            </div>
          </>
        )}

        <Button
          type="submit"
          disabled={submitMutation.isPending}
          className="bg-pub-primary-700 hover:bg-pub-primary-500 mt-2 w-fit"
        >
          {submitMutation.isPending && <Loader2 className="animate-spin" />}
          {submitMutation.isPending ? tForms('submitting') : tCommon('submit')}
        </Button>
        {submitMutation.isError && (
          <p className="text-pub-error text-sm">
            {submitMutation.error.response?.data?.error?.message ?? tForms('errorTitle')}
          </p>
        )}
      </form>
    </Form>
  );
}
