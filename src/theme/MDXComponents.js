// The components every manual page can use without an import: the theme's own, plus ManualVideo.
import MDXComponents from '@theme-original/MDXComponents';
import ManualVideo from '@site/src/components/ManualVideo';

export default {
  ...MDXComponents,
  ManualVideo,
};
