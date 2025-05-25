import {
  useEffect,
  useState,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { useParams } from "next/navigation";
import { nanoid } from "nanoid";
import Locale from "../locales";
import { copyToClipboard, downloadAs, safeShowSnackbar } from "../app/utils";
import { Path, ApiPath, REPO_URL } from "../app/constant";
import { useSnackbar } from "./SnackbarProvider";
import MuiIconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import ShareIcon from '@mui/icons-material/Share';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import GitHubIcon from '@mui/icons-material/GitHub';
import ReplayIcon from '@mui/icons-material/Replay';
import styles from "./artifacts.module.scss";

type HTMLPreviewProps = {
  code: string;
  autoHeight?: boolean;
  height?: number | string;
  onLoad?: (title?: string) => void;
};

export type HTMLPreviewHander = {
  reload: () => void;
};

export const HTMLPreview = forwardRef<HTMLPreviewHander, HTMLPreviewProps>(
  function HTMLPreview(props, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [frameId, setFrameId] = useState<string>(nanoid());
    const [iframeHeight, setIframeHeight] = useState(600);
    const [title, setTitle] = useState("");
    /*
     * https://stackoverflow.com/questions/19739001/what-is-the-difference-between-srcdoc-and-src-datatext-html-in-an
     * 1. using srcdoc
     * 2. using src with dataurl:
     *    easy to share
     *    length limit (Data URIs cannot be larger than 32,768 characters.)
     */

    useEffect(() => {
      const handleMessage = (e: any) => {
        const { id, height, title } = e.data;
        setTitle(title);
        if (id == frameId) {
          setIframeHeight(height);
        }
      };
      window.addEventListener("message", handleMessage);
      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, [frameId]);

    useImperativeHandle(ref, () => ({
      reload: () => {
        setFrameId(nanoid());
      },
    }));

    const height = useMemo(() => {
      if (!props.autoHeight) return props.height || 600;
      if (typeof props.height === "string") {
        return props.height;
      }
      const parentHeight = props.height || 600;
      return iframeHeight + 40 > parentHeight
        ? parentHeight
        : iframeHeight + 40;
    }, [props.autoHeight, props.height, iframeHeight]);

    const srcDoc = useMemo(() => {
      const script = `<script>window.addEventListener("DOMContentLoaded", () => new ResizeObserver((entries) => parent.postMessage({id: '${frameId}', height: entries[0].target.clientHeight}, '*')).observe(document.body))</script>`;
      if (props.code.includes("<!DOCTYPE html>")) {
        props.code.replace("<!DOCTYPE html>", "<!DOCTYPE html>" + script);
      }
      return script + props.code;
    }, [props.code, frameId]);

    const handleOnLoad = () => {
      if (props?.onLoad) {
        props.onLoad(title);
      }
    };

    return (
      <iframe
        className={styles["artifacts-iframe"]}
        key={frameId}
        ref={iframeRef}
        sandbox="allow-forms allow-modals allow-scripts"
        style={{ height }}
        srcDoc={srcDoc}
        onLoad={handleOnLoad}
      />
    );
  },
);

export function ArtifactsShareButton({
  getCode,
  id,
  style,
  fileName,
}: {
  getCode: () => string;
  id?: string;
  style?: any;
  fileName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(id);
  const [showDialog, setShowDialog] = useState(false);
  const { showSnackbar } = useSnackbar();

  const shareUrl = useMemo(
    () => [location.origin, "#", Path.Artifacts, "/", name].join(""),
    [name],
  );

  // const upload = useCallback((code: string) =>
  //   id
  //     ? Promise.resolve({ id })
  //     : fetch(ApiPath.Artifacts, {
  //         method: "POST",
  //         body: code,
  //       })
  //         .then((res) => res.json())
  //         .then(({ id: newId }) => {
  //           if (newId) {
  //             return { id: newId };
  //           }
  //           throw new Error("Upload failed, no ID returned");
  //         })
  //         .catch((e) => {
  //           console.error("[Artifacts] Upload Error:", e);
  //           showSnackbar(Locale.Export.Artifacts.Error, 'error');
  //           return null;
  //         }), [id, showSnackbar]
  // );

  // const handleShareClick = useCallback(() => {
  //   if (loading) return;
  //   setLoading(true);
  //   upload(getCode())
  //     .then((res) => {
  //       if (res?.id) {
  //         setShowDialog(true);
  //         setName(res?.id);
  //       }
  //     })
  //     .finally(() => setLoading(false));
  // }, [loading, upload, getCode]);

  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const handleDownload = useCallback(() => {
    downloadAs(getCode(), `${fileName || name}.html`);
    handleCloseDialog();
  }, [getCode, fileName, name]);

  const handleCopy = useCallback(() => {
    copyToClipboard(shareUrl);
    handleCloseDialog();
  }, [shareUrl, handleCloseDialog]);

  return (
    <>
      {/* <div className="window-action-button" style={style}>
        <MuiIconButton
          size="small"
          title={Locale.Export.Artifacts.Title}
          onClick={handleShareClick}
          disabled={loading}
          aria-label={Locale.Export.Artifacts.Title}
        >
          {loading ? <CircularProgress size={20} /> : <ShareIcon fontSize="inherit" />}
        </MuiIconButton>
      </div> */}
      <Dialog open={showDialog} onClose={handleCloseDialog}>
        <DialogTitle>{Locale.Export.Artifacts.Title}</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ wordBreak: 'break-all' }}>
            <a target="_blank" rel="noopener noreferrer" href={shareUrl}>
              {shareUrl}
            </a>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            key="download"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
          >
            {Locale.Export.Download}
          </Button>
          <Button
            key="copy"
            startIcon={<ContentCopyIcon />}
            onClick={handleCopy}
          />
          <Button onClick={handleCloseDialog}>{Locale.UI.Cancel}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export function Artifacts() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { showSnackbar } = useSnackbar();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [fileName, setFileName] = useState("");
  const previewRef = useRef<HTMLPreviewHander>(null);

  // useEffect(() => {
  //   if (id) {
  //     setLoading(true);
  //     fetch(`${ApiPath.Artifacts}?id=${id}`)
  //       .then((res) => {
  //         if (!res.ok) {
  //           throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  //         }
  //         return res.text();
  //       })
  //       .then(setCode)
  //       .catch((e) => {
  //         console.error("[Artifacts] Fetch Error:", e);
  //         showSnackbar(Locale.Export.Artifacts.Error, 'error');
  //       })
  //       .finally(() => {
  //         // Ensure loading is set to false even on error
  //         // setLoading(false); // Moved setting false to onLoad of HTMLPreview
  //       });
  //   }
  // }, [id, showSnackbar]);

  return (
    <div className={styles["artifacts"]}>
      <div className={styles["artifacts-header"]}>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          <MuiIconButton 
            aria-label="GitHub Repository"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon />
          </MuiIconButton>
        </a>
        <MuiIconButton
          style={{ marginLeft: 20 }}
          aria-label="Reload Preview"
          onClick={() => previewRef.current?.reload()}
        >
          <ReplayIcon />
        </MuiIconButton>
        <div className={styles["artifacts-title"]}>NextChat Artifacts</div>
        <ArtifactsShareButton
          id={id}
          getCode={() => code}
          fileName={fileName}
        />
      </div>
      <div className={styles["artifacts-content"]}>
        {loading && <div className={styles["loading-container"]}><CircularProgress /></div>}
        {code && !loading && (
          <HTMLPreview
            code={code}
            ref={previewRef}
            autoHeight={false}
            height={"100%"}
            onLoad={(title) => {
              setFileName(title as string);
              setLoading(false);
            }}
          />
        )}
      </div>
    </div>
  );
}
