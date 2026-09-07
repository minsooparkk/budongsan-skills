# 계산식 출처와 검증 범위

**이 플러그인은 budongsanbaksa 계산기의 순수 계산 모듈을 그대로 가져와 별도 실행 파일로 배포합니다.** 화면, 계정, 서버 연결 코드는 포함하지 않았으며, 사용자의 계산 입력을 원본 서비스로 전송하지 않습니다.

**이 스냅샷은 원본의 작업 중 변경사항을 포함합니다.** 원본 기준 커밋은 `7ff8a4cb66ab2b8089ee7d37e61d65943ab17302`이고, 가져온 날짜는 2026-09-07입니다. 커밋만으로 같은 파일을 복원할 수 없으므로 아래 SHA256이 실제 복사본을 식별합니다. 기계가 읽는 정보는 [engine/provenance.json](../engine/provenance.json)에 있습니다.

**계산식과 기본 예시는 복사 과정에서 바꾸지 않았습니다.** 화면용 기본값은 예시일 수 있으므로 대화 스킬은 필수 정보를 따로 받고, 선택 정보의 전제를 사용자에게 밝혀야 합니다. 원본에 포함된 미래 연도·개편 시나리오는 해당 시나리오의 가정이며 현행법 확정값을 뜻하지 않습니다.

**배포된 JavaScript는 TypeScript 원본에서 다시 만들 수 있습니다.** Node.js 22 이상만 있으면 계산과 배포 런타임 검증을 실행할 수 있습니다. 원본을 수정하는 개발자만 TypeScript 컴파일러가 필요하며, 동일한 결과를 재현하려면 배포본과 같은 TypeScript 5.9.3을 사용합니다. 빌드는 엄격한 타입 검사를 통과해야 하며, `--check`는 배포된 실행 파일과 선언 파일, export 목록, 빌드 지문을 새 빌드와 비교합니다.

```sh
node scripts/build-engine.cjs --typescript /path/to/typescript
node scripts/build-engine.cjs --typescript /path/to/typescript --check
```

**회귀 검증은 계산 결과와 경계값을 확인하며 최신 법령의 완전성을 보증하지 않습니다.** 원본의 verify-calc, verify-phase1~4, verify-audit-calc-core 검증 692개를 옮겼으며 컴파일 준비 코드만 배포 런타임 로딩으로 바꾸었습니다. verify-calc의 임시 출력 삭제 코드도 제거했습니다. 계산 사례·기대값·검증 조건은 그대로 유지했습니다. 보유세 모듈에는 독립적으로 계산한 금액·공제 경계·합계 관계를 확인하는 검증 8개를 추가했습니다. 브라우저·React·앱 검증은 범위에 포함하지 않았습니다.

**모듈별 지문은 원본과 배포용 TypeScript가 같은지 확인하는 기준입니다.** `engine/src` 아래 파일의 SHA256을 아래 표와 대조하면 됩니다.

| 배포 원본 | SHA256 |
| --- | --- |
| `engine/src/acquisition.ts` | `e57abd97dfb9fde5e7df48bc58be4042087b1d0f7b8863071d73265bc006f52b` |
| `engine/src/auction.ts` | `8e930e699dec7b45fd8dd7d8eebab4ffb2b29bbc200c7fff578156ad7d80dc37` |
| `engine/src/bands.ts` | `3f4342533310110dcdcb5c0556966ddf4df630a2871efb8ab45c1aef0a6833fd` |
| `engine/src/brokerage.ts` | `03d75b0413ae35e820405215911783ff3cb2f8a4b401821711f8b240335d02d4` |
| `engine/src/corporate.ts` | `a535b73db5cbde4890ab5e9edd56b0b4263dc92c55eb97234f9ee4087d13232e` |
| `engine/src/fees.ts` | `4f704e35dbc19aa43bc3ca969eb4471f792e37062d9a1fb66b86f2c100d618f4` |
| `engine/src/finance.ts` | `0342553f0a89d7c03a80c07df0c199f5b6382c02e1309c8c72d7f9cfa2cf1a3d` |
| `engine/src/gift.ts` | `0f66c190baacaa1fb1a7fc9c80fc94d68c4a9419f0f62d01daaec47996d15066` |
| `engine/src/heirs.ts` | `4436376b2099e94d048ecb43afe0f3e02ad524b5afa6d778c053afcbf62adc36` |
| `engine/src/inheritance.ts` | `b8ce44a20cc884a5b5ce3265c57b01da96c17717f15020d7f2eed0a4ec644914` |
| `engine/src/invest.ts` | `fe378eaa5049da60150d5b14b7c03d58bd90f834ff9d78ceb25b3419403d440c` |
| `engine/src/lease.ts` | `b628e4820c6b0bbb6048cb298bf68a20148a2c11a7ef17bafae9d430ad69cbb5` |
| `engine/src/progressive.ts` | `2f229b007240972e855d4396c44dbbf8c66aaefbbe73ee27a4205492d238dbf4` |
| `engine/src/property.ts` | `4fe2caa055eef4bb07e9b6752679ebb2b2b22f4e73f707af875fe4970cf2ce41` |
| `engine/src/registration.ts` | `b9bdf3178df5d6c54b4290b7ee6c11742b88a5fbf49505314e0b5fbfcb23b661` |
| `engine/src/trace.ts` | `f2523981a620a423ae77715d1dc1eb8c11b2267231d9186c6c82af6462c8058e` |
| `engine/src/transfer.ts` | `2807ef4f0f6de539eb23e7fbe4155515379689afe637b1819ded5fc7f4b09cc0` |
| `engine/src/units.ts` | `2501fccd5cbcf52af536e817ea3cf35afac8a2c3f4efca8a450376eabcf1c22c` |
| `engine/src/validation.ts` | `12e06b7212636f04146d974b05c8ea6e7875fdb9d965f4185859471878f92247` |
| `engine/src/won.ts` | `4eea01568e54fc69f07de8f2e8de5e30b5ba5fa3572bff4eec135c289d9b75f1` |
| `engine/src/boyuse.ts` | `7e28bbcba5dd74ef64f79a027569863ca065769307349801df124890fe1ee864` |

**검증 파일의 원본 지문과 적응본 지문도 함께 기록했습니다.** 자세한 목록은 `engine/provenance.json`의 `testFiles`에 있습니다.
