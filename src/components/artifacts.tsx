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
import { copyToClipboard, downloadAs } from "../utils/utils";
import { Path, REPO_URL } from "../types/constant";
import { useSnackbar } from "../providers/snackbar-provider";
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

// Placeholder for icons - replace with actual SVGs or a library
const IconPlaceholder = ({ name, className }: { name: string, className?: string }) => <span className={`text-sm ${className}`}>[{name}]</span>;

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

  const handleShareClick = () => {
    if (loading) return;
    setLoading(true);
    setTimeout(() => {
      const mockId = id || nanoid(8);
      setName(mockId);
      setShowDialog(true);
      setLoading(false);
    }, 500);
  };

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
    showSnackbar(Locale.Export.Copied, 'success');
  }, [shareUrl, handleCloseDialog, showSnackbar]);

  return (
    <>
      <button 
        className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50"
        style={style} 
        title={Locale.Export.Artifacts.Title}
        onClick={handleShareClick}
        disabled={loading}
        aria-label={Locale.Export.Artifacts.Title}
      >
        {loading ? <IconPlaceholder name="Loading..." className="animate-spin"/> : <IconPlaceholder name="Share" />}
      </button>

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={handleCloseDialog}>
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-semibold mb-4">{Locale.Export.Artifacts.Title}</h2>
            <div className="mb-4 break-all">
              <a target="_blank" rel="noopener noreferrer" href={shareUrl} className="text-blue-600 hover:underline">
                {shareUrl}
              </a>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center"
                onClick={handleDownload}
              >
                <IconPlaceholder name="Download" className="mr-2" /> {Locale.Export.Download}
              </button>
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 flex items-center"
                onClick={handleCopy}
              >
                <IconPlaceholder name="Copy" className="mr-2"/> {Locale.Copy.Success || Locale.Export.Copy}
              </button>
              <button 
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                onClick={handleCloseDialog}
              >
                {Locale.UI.Cancel}
              </button>
            </div>
          </div>
        </div>
      )}
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

  useEffect(() => {
    if (id) {
      setLoading(true);
      setTimeout(() => {
        setCode("<h1>Hello from Artifact ID: " + id + "</h1><p>This is a sample artifact.</p>");
        setLoading(false);
      }, 1000);
    } else {
      setCode("<h1>No artifact ID provided.</h1><p>This is a generic placeholder.</p>");
      setLoading(false);
    }
  }, [id, showSnackbar]);

  return (
    <div className="flex flex-col w-full h-full bg-gray-100">
      <div className="flex items-center h-14 p-5 bg-gray-100">
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="p-2 rounded-md hover:bg-gray-200" title="GitHub Repository">
          <IconPlaceholder name="GitHub" />
        </a>
        <button
          className="ml-5 p-2 rounded-md hover:bg-gray-200"
          aria-label="Reload Preview"
          onClick={() => previewRef.current?.reload()}
        >
          <IconPlaceholder name="Replay" />
        </button>
        <div className="flex-1 text-center font-bold text-2xl text-gray-800">NextChat Artifacts</div>
        <ArtifactsShareButton
          id={id}
          getCode={() => code}
          fileName={fileName}
        />
      </div>
      <div className="flex-grow p-5 bg-gray-100">
        {loading && (
          <div className="flex justify-center items-center h-full">
            <IconPlaceholder name="Loading..." className="text-3xl animate-spin" />
          </div>
        )}
        {code && !loading && (
          <HTMLPreview
            code={code}
            ref={previewRef}
            autoHeight={false}
            height="100%"
            onLoad={(title) => {
              setFileName(title as string);
              setLoading(false);
            }}
          />
        )}
        {!code && !loading && (
          <div className="flex justify-center items-center h-full">
            <p className="text-gray-500">No content to display.</p>
          </div>
        )}
      </div>
    </div>
  );
}
