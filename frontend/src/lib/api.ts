import { JobApplication, AnalyzeJobResponse, Resume } from '@/types';

const API_BASE_URL = '/api';

interface BackendJob {
  id: number;
  created_at: string;
  company: string;
  title: string;
  match_score: number;
  url: string;
  original_jd: string;
  resume: string;
  cover_letter: string;
  status: string;
}

// Helper to normalize backend Job to frontend JobApplication
const normalizeJob = (job: BackendJob): JobApplication => ({
  id: job.id.toString(),
  dateAdded: job.created_at || new Date().toISOString().split('T')[0],
  companyName: job.company,
  jobTitle: job.title,
  matchScore: job.match_score,
  jobUrl: job.url,
  jobDescription: job.original_jd || '',
  resume: job.resume,
  coverLetter: job.cover_letter,
  status: job.status as JobApplication['status'],
  applied: job.status === 'applied',
});


// API Functions
export async function getApplications(): Promise<JobApplication[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs`);
    if (!response.ok) throw new Error('Failed to fetch applications');
    const data = await response.json();
    return data.map(normalizeJob);
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

export async function getApplication(id: string): Promise<JobApplication | undefined> {
  try {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
    if (!response.ok) throw new Error('Failed to fetch application');
    const data = await response.json();
    return normalizeJob(data);
  } catch (error) {
    console.error(`Error fetching application ${id}:`, error);
    return undefined;
  }
}

export async function updateApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication | undefined> {
  // Map frontend camelCase to backend snake_case
  const backendUpdates: Record<string, unknown> = { ...updates as Record<string, unknown> };
  if (updates.coverLetter !== undefined) {
    backendUpdates.cover_letter = updates.coverLetter;
    delete backendUpdates.coverLetter;
  }

  const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backendUpdates),
  });

  if (!response.ok) throw new Error('Failed to update application');
  const data = await response.json();
  return normalizeJob(data);
}

export async function analyzeJobUrl(url: string, resumeId: number): Promise<AnalyzeJobResponse & { id: string }> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, resume_id: resumeId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Analysis failed');
  }

  const data = await response.json();
  return {
    id: data.job_id.toString(),
    companyName: data.company,
    jobTitle: data.title || 'Software Engineer',
    jobDescription: '',
    matchScore: data.score,
    resume: data.resume,
    coverLetter: data.cover_letter || '',
  };
}

export async function analyzeJobDescription(description: string, resumeId: number): Promise<AnalyzeJobResponse & { id: string }> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, resume_id: resumeId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Analysis failed');
  }

  const data = await response.json();
  return {
    id: data.job_id.toString(),
    companyName: data.company,
    jobTitle: data.title || 'Software Engineer',
    jobDescription: description,
    matchScore: data.score,
    resume: data.resume,
    coverLetter: data.cover_letter || '',
  };
}

export async function saveApplication(application: Partial<JobApplication>): Promise<JobApplication> {
  // Application is already saved by /api/analyze, but we return the object for frontend logic compatibility
  return application as JobApplication;
}

export async function deleteApplication(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete application');
}

export async function regenerateContent(id: string, prompt?: string): Promise<{ resume: string; coverLetter: string; matchScore?: number }> {
  const response = await fetch(`${API_BASE_URL}/jobs/${id}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to regenerate content');
  }

  return await response.json();
}

export async function uploadResume(file: File, name?: string): Promise<Resume> {
  const formData = new FormData();
  formData.append('file', file);
  if (name) formData.append('name', name);

  const response = await fetch(`${API_BASE_URL}/resumes/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload resume');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    content: data.preview, // We use preview in the UI
    is_selected: data.is_selected,
  };
}

export async function importResumeFromUrl(url: string, name?: string): Promise<Resume> {
  const response = await fetch(`${API_BASE_URL}/resumes/import-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to import resume');
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    content: data.preview,
    is_selected: data.is_selected,
  };
}

export async function addResumeManual(content: string, name?: string): Promise<Resume> {
  const response = await fetch(`${API_BASE_URL}/resumes/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, name }),
  });

  if (!response.ok) {
    let errorDetail = 'Failed to save manual resume';
    try {
      const error = await response.json();
      errorDetail = error.detail || errorDetail;
    } catch (e) {
      // Fallback if not JSON (e.g. 500 HTML or 404 HTML)
      const text = await response.text();
      console.error('Non-JSON error response:', text);
    }
    throw new Error(errorDetail);
  }

  const data = await response.json();
  return {
    id: data.id,
    name: data.name,
    content: data.preview,
    is_selected: data.is_selected,
  };
}

export async function getResumes(): Promise<Resume[]> {
  const response = await fetch(`${API_BASE_URL}/resumes`);
  if (!response.ok) throw new Error('Failed to fetch resumes');
  const data = await response.json();
  return data.map((r: { id: number; name: string; preview: string; is_selected: boolean }) => ({
    id: r.id,
    name: r.name,
    content: r.preview || '',
    is_selected: r.is_selected,
  }));
}


export async function getSelectedResume(): Promise<Resume | undefined> {
  const resumes = await getResumes();
  return resumes.find(r => r.is_selected) || resumes[0];
}

export function downloadJobPdf(jobId: string, type: 'resume' | 'cover' = 'resume') {
  window.location.assign(`${API_BASE_URL}/jobs/${jobId}/pdf?pdf_type=${type}`);
}

export function downloadJobDocx(jobId: string, type: 'resume' | 'cover' = 'resume') {
  window.location.assign(`${API_BASE_URL}/jobs/${jobId}/docx?type=${type}`);
}

export function downloadResumePdf(resumeId: string) {
  window.location.assign(`${API_BASE_URL}/resumes/${resumeId}/pdf`);
}

export function downloadResumeDocx(resumeId: string) {
  window.location.assign(`${API_BASE_URL}/resumes/${resumeId}/docx`);
}

