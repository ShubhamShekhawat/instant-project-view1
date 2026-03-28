import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchEventTypes, createEventType, updateEventType, deleteEventType, type EventType, type CustomQuestion } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Copy, Pencil, Trash2, Clock, Link as LinkIcon, ExternalLink, Shield, MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

export default function EventTypes() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventType | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: 30,
    slug: "",
    color: "#2563eb",
    buffer_time: 0,
    custom_questions: [] as CustomQuestion[],
  });

  const { data: eventTypes = [], isLoading } = useQuery({
    queryKey: ["event_types"],
    queryFn: fetchEventTypes,
  });

  const createMutation = useMutation({
    mutationFn: createEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types"] });
      setDialogOpen(false);
      resetForm();
      toast.success("Event type created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateEventType(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types"] });
      setDialogOpen(false);
      setEditingEvent(null);
      resetForm();
      toast.success("Event type updated");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEventType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_types"] });
      toast.success("Event type deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => updateEventType(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_types"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () =>
    setForm({ title: "", description: "", duration: 30, slug: "", color: "#2563eb", buffer_time: 0, custom_questions: [] });

  const openCreate = () => {
    setEditingEvent(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (et: EventType) => {
    setEditingEvent(et);
    const questions = (et.custom_questions as unknown as CustomQuestion[] | null) || [];
    setForm({
      title: et.title,
      description: et.description || "",
      duration: et.duration,
      slug: et.slug,
      color: et.color || "#2563eb",
      buffer_time: et.buffer_time || 0,
      custom_questions: questions,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.slug) return toast.error("Title and slug are required");
    const payload = { ...form, custom_questions: form.custom_questions as unknown as any };
    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, updates: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
    toast.success("Booking link copied!");
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  };

  const addQuestion = () => {
    setForm((f) => ({
      ...f,
      custom_questions: [
        ...f.custom_questions,
        { id: crypto.randomUUID(), label: "", required: false, type: "text" },
      ],
    }));
  };

  const removeQuestion = (id: string) => {
    setForm((f) => ({
      ...f,
      custom_questions: f.custom_questions.filter((q) => q.id !== id),
    }));
  };

  const updateQuestion = (id: string, updates: Partial<CustomQuestion>) => {
    setForm((f) => ({
      ...f,
      custom_questions: f.custom_questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    }));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Event Types</h1>
          <p className="text-sm text-muted-foreground mt-1">Create events to share for people to book on your calendar.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-cal-brand text-cal-brand-foreground hover:bg-cal-brand/90">
              <Plus className="h-4 w-4 mr-2" /> New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "Edit Event Type" : "New Event Type"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      title: e.target.value,
                      slug: editingEvent ? f.slug : generateSlug(e.target.value),
                    }));
                  }}
                  placeholder="Quick Chat"
                />
              </div>
              <div>
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">/book/</span>
                  <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="quick-chat" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="A brief meeting..." rows={2} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Duration (min)</Label>
                  <Input type="number" min={5} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value) || 15 }))} />
                </div>
                <div className="flex-1">
                  <Label className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> Buffer (min)
                  </Label>
                  <Input type="number" min={0} value={form.buffer_time} onChange={(e) => setForm((f) => ({ ...f, buffer_time: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <Label>Color</Label>
                  <Input type="color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} className="w-16 h-9 p-1 cursor-pointer" />
                </div>
              </div>

              {/* Custom Questions */}
              <div className="border-t border-border pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" /> Custom Booking Questions
                  </Label>
                  <Button type="button" variant="ghost" size="sm" onClick={addQuestion} className="text-xs text-muted-foreground">
                    <Plus className="h-3 w-3 mr-1" /> Add
                  </Button>
                </div>
                {form.custom_questions.length === 0 && (
                  <p className="text-xs text-muted-foreground">No custom questions. Bookers will only fill name & email.</p>
                )}
                <div className="space-y-3">
                  {form.custom_questions.map((q) => (
                    <div key={q.id} className="flex items-start gap-2 p-3 rounded-md bg-muted/50">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={q.label}
                          onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                          placeholder="e.g. What's the meeting about?"
                          className="text-sm"
                        />
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                            <input
                              type="checkbox"
                              checked={q.required}
                              onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                              className="rounded"
                            />
                            Required
                          </label>
                          <select
                            value={q.type}
                            onChange={(e) => updateQuestion(q.id, { type: e.target.value as "text" | "textarea" })}
                            className="text-xs bg-transparent border border-border rounded px-2 py-1"
                          >
                            <option value="text">Short text</option>
                            <option value="textarea">Long text</option>
                          </select>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-cal-brand text-cal-brand-foreground hover:bg-cal-brand/90" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingEvent ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="cal-card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : eventTypes.length === 0 ? (
        <div className="cal-card p-12 text-center">
          <p className="text-muted-foreground">No event types yet. Create your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventTypes.map((et) => {
            const questions = (et.custom_questions as unknown as CustomQuestion[] | null) || [];
            return (
              <div key={et.id} className="cal-card flex items-center gap-4 p-4 hover:shadow-md transition-shadow">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: et.color || "#2563eb" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{et.title}</h3>
                    {!et.is_active && (
                      <span className="cal-badge bg-muted text-muted-foreground">Disabled</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {et.duration}m
                    </span>
                    {et.buffer_time > 0 && (
                      <span className="flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5" />
                        {et.buffer_time}m buffer
                      </span>
                    )}
                    {questions.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {questions.length} question{questions.length > 1 ? "s" : ""}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <LinkIcon className="h-3.5 w-3.5" />
                      /book/{et.slug}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Switch
                    checked={et.is_active ?? true}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: et.id, is_active: checked })}
                  />
                  <Link to={`/book/${et.slug}`} target="_blank">
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => copyLink(et.slug)} className="text-muted-foreground hover:text-foreground">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(et)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Delete this event type?")) deleteMutation.mutate(et.id);
                    }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
