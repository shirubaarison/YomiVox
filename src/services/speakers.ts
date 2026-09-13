import { VOICEVOX_BASE } from "../config.js";

interface Style {
  name: string;
  id: number;
}

interface Speaker {
  name: string;
  speaker_uuid: string;
  styles: Style[];
}

interface StyleInfo {
  id: number;
  icon: string;
  portrait: string;
}

interface SpeakerInfo {
  policy: string;
  portrait: string;
  style_infos: StyleInfo[];
}

export async function getSpeakers(): Promise<Speaker[]> {
  const res = await fetch(`${VOICEVOX_BASE}/speakers`);
  if (!res.ok) throw new Error("Voicevox not running");
  return res.json();
}

export async function getSpeakerInfo(uuid: string): Promise<SpeakerInfo> {
  const res = await fetch(`${VOICEVOX_BASE}/speaker_info?speaker_uuid=${uuid}`);
  return res.json();
}
