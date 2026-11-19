// 브라우저 캐시와 서버(Supabase) 중 어느 쪽 데이터를 쓸지 정하는 규칙 (순수 함수)
//
// local:  { data, savedAt(ms), synced(bool) } | null   이 기기에 저장된 사본
// remote: { data, updated_at(ISO 문자열) } | null        서버에 저장된 값
//
// - 서버 값이 없으면 이 기기 사본을 쓰고 서버로 올린다.
// - 이 기기에 아직 서버로 못 올린(synced=false) 더 최신 사본이 있으면 그걸 쓰고 올린다.
//   (예: 앱을 닫는 순간 저장한 공부 타이머)
// - 그 밖에는 서버 값을 쓴다. (다른 기기에서 바꾼 내용)

export function pickNewer(local, remote) {
  if (!remote) return local ? { data: local.data, push: true } : { data: null, push: false };
  const remoteTime = Date.parse(remote.updated_at) || 0;
  if (local && !local.synced && local.savedAt > remoteTime) return { data: local.data, push: true };
  return { data: remote.data, push: false };
}
