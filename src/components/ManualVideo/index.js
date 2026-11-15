// <ManualVideo n="01" />: the tutorial video of a manual page, in the page's language, from
// src/data/videos.json (the ids live there only). Usable in any page without an import (see
// src/theme/MDXComponents.js).
//
// Before the data's availableFrom date (the YouTube premiere, start of the day in Brasília) it shows
// nothing; the date is checked in the browser, after hydration, so the server's HTML and the first
// client render are the same. The server's HTML always carries the video's number and id as data
// attributes (scripts/check-videos.mjs reads them), even while nothing is shown.

import React, {useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import data from '@site/src/data/videos.json';
import styles from './styles.module.css';

const TEXT = {
  en: {watch: 'Watch on YouTube', video: 'Video'},
  pt: {watch: 'Assistir no YouTube', video: 'Vídeo'},
};

/** When the videos may be shown (ms), or null when there is no date. */
export function availableFromMs(availableFrom) {
  if (!availableFrom) return null;
  return Date.parse(`${availableFrom}T00:00:00-03:00`);
}

export default function ManualVideo({n}) {
  const {i18n} = useDocusaurusContext();
  const lang = i18n.currentLocale === 'pt' ? 'pt' : 'en';
  const video = data.videos[n]?.[lang];
  if (!video) throw new Error(`ManualVideo: no video ${n} in ${lang} in src/data/videos.json`);

  const from = availableFromMs(data.availableFrom);
  const [shown, setShown] = useState(from === null);
  useEffect(() => {
    if (from !== null) setShown(Date.now() >= from);
  }, [from]);

  const text = TEXT[lang];
  return (
    <div className={shown ? styles.video : undefined} data-manual-video={n} data-video-id={video.id}>
      {shown && (
        <>
          <div className={styles.frame}>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.id}`}
              title={`${text.video}: ${video.title}`}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <p className={styles.link}>
            <a href={`https://youtu.be/${video.id}`} target="_blank" rel="noopener noreferrer">
              {text.watch}
            </a>
          </p>
        </>
      )}
    </div>
  );
}
