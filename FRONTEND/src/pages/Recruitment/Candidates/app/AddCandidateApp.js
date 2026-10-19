// Mobile intake; desktop AddCandidateDrawer remains unchanged.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { checkCandidateDuplicate, createCandidate } from "../../../../services/recruitmentService";
import { deleteTemporaryResume, normalizeResumeParseResult, parseCandidateResume } from "../../../../services/resumeParserService";
import ResumeUploadPanel from "../ResumeUploadPanel";
import ResumeReviewForm from "./CandidateFormApp";
import "./CandidateFormApp.css";
import { getApiErrorMessage, getRecordId, safeText } from "../../utils/recruitmentHelpers";
const getTempFileName = (resume = {}) => {
  return resume?.tempFileName || resume?.fileName || resume?.filename || "";
};
const buildResumePayload = (resume, file, parserMeta) => {
  const tempFileName = getTempFileName(resume);
  if (!tempFileName) {
    return {};
  }
  return {
    ...resume,
    tempFileName,
    fileName: resume?.fileName || tempFileName,
    originalName: resume?.originalName || file?.name || "",
    mimeType: resume?.mimeType || file?.type || "application/pdf",
    size: Number(resume?.size || file?.size || 0),
    parsed: true,
    parserProvider: parserMeta?.provider || resume?.parserProvider || "LOCAL_PDF_PARSER",
    parserConfidence: parserMeta?.confidence ?? null
  };
};
const AddCandidateApp = ({
  open,
  requirement,
  onClose,
  onCreated
}) => {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open]);
  const requirementId = getRecordId(requirement);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parseResult, setParseResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parsing, setParsing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const normalized = useMemo(() => parseResult ? normalizeResumeParseResult(parseResult) : {
    parsed: {},
    resume: {},
    duplicate: null,
    matching: {},
    reviewFields: [],
    parserMeta: {}
  }, [parseResult]);
  const cvParsed = Boolean(parseResult);
  useEffect(() => {
    if (!open) {
      return;
    }
    setSelectedFile(null);
    setParseResult(null);
    setUploading(false);
    setUploadProgress(0);
    setParsing(false);
    setCreating(false);
    setError("");
  }, [open, requirementId]);
  const cleanupTemporary = async () => {
    const fileName = getTempFileName(normalized.resume);
    if (!fileName) {
      return;
    }
    try {
      await deleteTemporaryResume(fileName);
    } catch (cleanupError) {
      console.warn("Temporary resume cleanup failed:", cleanupError);
    }
  };
  const handleClose = async () => {
    if (uploading || parsing || creating) {
      return;
    }
    if (parseResult) {
      await cleanupTemporary();
    }
    onClose?.();
  };
  const handleFileSelected = async file => {
    if (!file || !requirementId) {
      return;
    }
    if (parseResult) {
      await cleanupTemporary();
    }
    try {
      setSelectedFile(file);
      setParseResult(null);
      setUploadProgress(0);
      setUploading(true);
      setParsing(false);
      setError("");
      let uploadFinished = false;
      const resultPromise = parseCandidateResume(file, requirementId, {
        onUploadProgress: percent => {
          setUploadProgress(percent);
          if (percent >= 100 && !uploadFinished) {
            uploadFinished = true;
            setUploading(false);
            setParsing(true);
          }
        }
      });
      const result = await resultPromise;
      setUploadProgress(100);
      setUploading(false);
      setParsing(true);
      setParseResult(result);
      await new Promise(resolve => setTimeout(resolve, 220));
      setParsing(false);
    } catch (parseError) {
      setUploading(false);
      setParsing(false);
      setUploadProgress(0);
      setParseResult(null);
      setSelectedFile(null);
      setError(getApiErrorMessage(parseError, "Resume could not be uploaded or parsed."));
    }
  };
  const handleReplace = () => {
    setError("");
  };
  const handleCreate = async reviewedPayload => {
    if (!requirementId) {
      setError("Hiring requirement ID is missing.");
      return;
    }
    if (!parseResult) {
      setError("Please upload and parse the candidate CV first.");
      return;
    }
    try {
      setCreating(true);
      setError("");
      const duplicateResult = await checkCandidateDuplicate({
        mobile: reviewedPayload?.mobile || "",
        email: reviewedPayload?.email || ""
      });
      const duplicateFound = Boolean(duplicateResult?.duplicate || duplicateResult?.isDuplicate || duplicateResult?.candidate?._id);
      if (duplicateFound) {
        throw new Error("A candidate with this mobile number or email already exists.");
      }
      const resume = buildResumePayload(normalized.resume, selectedFile, normalized.parserMeta);
      const payload = {
        ...reviewedPayload,
        resume
      };
      const candidate = await createCandidate(requirementId, payload);
      await onCreated?.(candidate);
    } catch (createError) {
      setError(getApiErrorMessage(createError, "Candidate could not be created."));
    } finally {
      setCreating(false);
    }
  };
  if (!open) {
    return null;
  }
  return <div className="se-candidate-drawer-overlay se-candidate-app-intake" onMouseDown={event => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }}>
      <section className="se-candidate-drawer se-candidate-single-form-modal" ref={dialogRef} tabIndex={-1} aria-labelledby="candidate-app-title" onKeyDown={event => {
      if (event.key === "Escape") handleClose();
      if (event.key !== "Tab") return;
      const controls = [...dialogRef.current.querySelectorAll("button, input, select, textarea, summary")].filter(control => !control.disabled && !control.hidden && control.getClientRects().length);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }} role="dialog" aria-modal="true" onMouseDown={event => event.stopPropagation()}>
        {}

        <header className="se-candidate-drawer-head se-single-form-head se-candidate-app-head">
          <button type="button" className="se-candidate-app-back" onClick={handleClose} disabled={uploading || parsing || creating} aria-label="Back to candidates">← Back</button>
          <div><h2 id="candidate-app-title">Add candidate</h2>
            <p>{safeText(requirement?.positionTitle, "Open position")} · {safeText(requirement?.requestNumber, "MPR")}</p>
          </div>
        </header>

        {}

        <div className="se-candidate-drawer-body se-single-form-body">
          {error ? <div className="se-candidate-drawer-error">
              <span>
                !
              </span>

              <div>
                <strong>
                  Candidate intake needs attention
                </strong>

                <p>
                  {error}
                </p>
              </div>

              <button type="button" onClick={() => setError("")}>
                ×
              </button>
            </div> : null}

          {}

          <ResumeUploadPanel file={selectedFile} uploading={uploading} uploadProgress={uploadProgress} parsing={parsing} parsed={cvParsed && !parsing} onFileSelected={handleFileSelected} onReplace={handleReplace} />

          {}

          <ResumeReviewForm parsed={normalized.parsed} matching={normalized.matching} duplicate={normalized.duplicate} parserMeta={normalized.parserMeta} reviewFields={normalized.reviewFields} requirement={requirement} fileName={selectedFile?.name || ""} cvParsed={cvParsed} parsing={parsing} creating={creating} onCreate={handleCreate} onCancel={handleClose} />
        </div>
      </section>
    </div>;
};
export default AddCandidateApp;
