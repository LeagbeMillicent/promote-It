"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, Check, X } from "lucide-react";

type ModalMode = "create" | "edit" | "delete" | "update";

export function RecordModal({ mode, title, recordId, fields, onClose, onSubmit, onDelete }: { mode: ModalMode; title: string; recordId?: string; fields: string[]; onClose: () => void; onSubmit: (values: Record<string, string>) => void; onDelete?: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field, ""])));
  const isDelete = mode === "delete";
  const heading = mode === "create" ? `Create ${title}` : mode === "edit" ? `Edit ${title}` : mode === "update" ? `Update ${title}` : `Delete ${title}`;
  function submit(event: FormEvent) { event.preventDefault(); onSubmit(values); }
  function confirm() { onSubmit(values); }

  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="record-modal-title"><div className="modal-header"><div className={isDelete ? "modal-warning-icon" : "modal-icon"}>{isDelete ? <AlertTriangle size={18} /> : <Check size={18} />}</div><div><h2 id="record-modal-title">{heading}</h2><p>{isDelete ? `This action will remove ${recordId ?? "this record"}.` : "Complete the fields below and confirm the change."}</p></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close modal"><X size={18} /></button></div>{isDelete ? <div className="modal-delete-body"><strong>Are you sure?</strong><p>Deleted records cannot be restored from this screen.</p></div> : <form onSubmit={submit}><div className="modal-fields">{fields.map((field) => <label key={field}>{field}<input value={values[field]} onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))} placeholder={`Enter ${field.toLowerCase()}`} /></label>)}</div></form>}<div className="modal-footer">{mode === "edit" && onDelete && <button className="danger-button" onClick={onDelete}>Delete</button>}<span className="modal-footer-spacer" /><button className="secondary-button" onClick={onClose}>Cancel</button><button className={isDelete ? "danger-button" : "primary-button"} onClick={confirm}>{isDelete ? "Delete record" : mode === "create" ? "Create record" : "Save changes"}</button></div></section></div>;
}
