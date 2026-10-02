#!/usr/bin/env bash
# 자습서 6장 "필요할 때만 켜는 훅"의 /careful 예시를 옮긴 PreToolUse 훅.
# Claude Code가 Bash 명령을 실행하기 직전에 표준 입력으로 JSON을 넘겨 준다.
# 위험한 명령이면 종료 코드 2로 막고, 막은 이유를 표준 오류로 Claude에게 알린다.
input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("tool_input", {}).get("command", ""))' 2>/dev/null)

patterns=(
  'rm[[:space:]]+-[a-zA-Z]*r[a-zA-Z]*f'   # rm -rf, rm -fr
  'rm[[:space:]]+-[a-zA-Z]*f[a-zA-Z]*r'
  'git[[:space:]]+push.*(--force|-f([[:space:]]|$))'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f'
  '[Dd][Rr][Oo][Pp][[:space:]]+([Tt][Aa][Bb][Ll][Ee]|[Dd][Aa][Tt][Aa][Bb][Aa][Ss][Ee])'
  'kubectl[[:space:]]+delete'
  'terraform[[:space:]]+(apply|destroy)'
)

for p in "${patterns[@]}"; do
  if printf '%s' "$cmd" | grep -Eq "$p"; then
    echo "careful 훅이 막은 명령입니다: $cmd" >&2
    echo "되돌리기 어려운 명령이므로 사용자에게 먼저 확인을 받으세요." >&2
    exit 2
  fi
done
exit 0
