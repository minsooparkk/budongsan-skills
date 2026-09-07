# 법령 소스 레지스터

기준일은 2026-09-07입니다.

핵심 결론은 이 플러그인이 `현행법 계산`과 `정부안 시뮬레이션`을 반드시 분리해야 한다는 점입니다. `transfer.ts`와 `boyuse.ts`에는 2026년 세제개편안이 섞여 있으므로, 출력에서 `현행`이라고 말하려면 법령정보센터의 현재 시행 조문이나 국세청의 현재 안내 페이지로 다시 확인해야 합니다.

## 현재법으로 고정할 기준

### 취득세는 지방세법 조문을 기준으로 고정합니다.

취득세는 `지방세법 제11조`, `제13조의2`, `제15조`, `제20조`, `제151조`, 그리고 재산세 과세표준과 연결되는 `제110조`, `제111조`, `제111조의2`, `제112조`를 현재법 기준으로 써야 합니다.

- `제11조`는 유상거래 주택의 6억 이하 1%, 6억 초과 9억 이하 구간별 계산식, 9억 초과 3%를 정합니다.
- `제13조의2`는 법인 주택 취득과 조정대상지역 다주택 중과를 정합니다.
- `제15조`는 상속·일부 무상취득의 특례세율을 정합니다.
- `제20조`는 취득세 신고·납부 기한을 정합니다.
- `제151조`는 취득세에 붙는 지방교육세의 계산 기준을 정합니다.

공식 근거 URL은 다음과 같습니다.

- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031175389
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1033360867
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031175569
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032970405
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026501211
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029491431
- https://www.law.go.kr/LSW/lsSideInfoP.do?docCls=jo&joBrNo=00&joNo=0109&lsiSeq=286395&urlMode=lsScJoRltInfoR
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026579343
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026499687
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1022095275
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1028974911

### 증여세는 상속세 및 증여세법 조문을 기준으로 고정합니다.

증여세는 `상속세 및 증여세법 제47조`, `제53조`, `제53조의2`, `제55조`, `제56조`, `제57조`, `제58조`, `제69조`를 현재법 기준으로 써야 합니다.

- `제47조`는 10년 이내 동일인 증여 합산의 기준을 정합니다.
- `제53조`는 배우자 6억원, 직계존속 5천만원, 미성년 직계존속 2천만원, 직계비속 5천만원, 친족 1천만원 공제를 정합니다.
- `제53조의2`는 혼인·출산 증여재산 공제 1억원을 정합니다.
- `제55조`는 과세최저한 50만원 미만 비과세를 정합니다.
- `제56조`는 상속세 세율표를 증여세에도 그대로 쓰게 합니다.
- `제57조`는 세대생략 할증 30%, 미성년·20억원 초과 구간 40%를 정합니다.
- `제58조`는 사전증여에 대해 낸 세액을 공제하는 기준을 정합니다.
- `제69조`는 신고세액공제 3%를 정합니다.

공식 근거 URL은 다음과 같습니다.

- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029616213
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1017648003
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1025381121
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029615901
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1027435947

### 상속세는 상속세 및 증여세법 조문을 기준으로 고정합니다.

상속세는 `상속세 및 증여세법 제13조`, `제14조`, `제18조`, `제19조`, `제20조`, `제21조`, `제22조`, `제23조의2`, `제24조`, `제25조`, `제26조`, `제69조`를 현재법 기준으로 써야 합니다.

- `제18조`는 기초공제 2억원을 정합니다.
- `제19조`는 배우자상속공제의 한도식과 30억원 상한을 정합니다.
- `제20조`는 자녀 1명 5천만원, 미성년 1천만원×남은 연수, 65세 이상 5천만원, 장애인 1천만원×기대여명을 정합니다.
- `제21조`는 일괄공제 5억원을 정하고, 배우자 단독상속 예외를 둡니다.
- `제22조`는 금융재산 상속공제 20%와 2억원 상한을 정합니다.
- `제23조의2`는 동거주택 상속공제 100%와 6억원 상한을 정합니다.
- `제24조`는 상속공제 한도를 정합니다.
- `제25조`는 과세최저한 50만원 미만 비과세를 정합니다.
- `제26조`는 상속세 세율표를 정합니다.
- `제69조`는 신고세액공제 3%를 정합니다.

공식 근거 URL은 다음과 같습니다.

- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029615565
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032164681
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029615467
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1024572131
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032161993
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029615523
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029820953
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029615611
- https://www.law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1027435947
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1027436079

### 양도소득세는 소득세법과 개인지방소득세 조문을 기준으로 고정합니다.

양도소득세는 `소득세법 제55조`, `제89조`, `제95조`, `제104조`와 `지방세법 제103조의3`을 현재법 기준으로 써야 합니다.

- `제89조`는 1세대 1주택 12억원 비과세의 출발점입니다.
- `제95조`는 장기보유특별공제의 출발점입니다.
- `제104조`는 기본세율, 단기보유, 다주택 중과, 조정대상지역 가산을 정합니다.
- `지방세법 제103조의3`은 양도소득에 대한 개인지방소득세 10%를 정합니다.

공식 근거 URL은 다음과 같습니다.

- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026637493
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1001061969
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1001061807
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1024350669
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032216855
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026501211

### 보유세는 지방세법과 종합부동산세법을 함께 봐야 합니다.

재산세와 지방교육세는 `지방세법 제110조`, `제111조`, `제111조의2`, `제112조`, `제151조`를 기준으로 써야 하고, 종합부동산세는 `종합부동산세법 제8조`, `제9조`를 함께 봐야 합니다.

- `지방세법 제111조`와 `제111조의2`는 재산세의 기본세율과 1세대 1주택 특례세율을 정합니다.
- `지방세법 제110조`와 시행령 `제109조`는 공정시장가액비율을 정합니다.
- `지방세법 제112조`는 도시지역분을 정합니다.
- `종합부동산세법 제8조`는 1세대 1주택 12억원 공제를 정합니다.
- `종합부동산세법 제9조`는 주택분 종합부동산세 세율을 정합니다.

공식 근거 URL은 다음과 같습니다.

- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1029491431
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1026579343
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031176989
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1028974911
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031196225
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1032159441
- https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lsJoLnkSeq=1031057413

### 국세청 안내 페이지는 사용자가 이해하기 쉬운 설명용으로만 씁니다.

국세청 안내 페이지는 법 조문을 대체하지 않고, 숫자와 흐름을 쉽게 보여 주는 보조 자료로만 써야 합니다.

- https://d.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7733&mi=2351
- https://d.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7739&mi=40401
- https://d.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7735&mi=2353
- https://g.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=7711&mi=2312

## 정부안은 현재법과 분리해야 합니다.

`transfer.ts`의 2027~2029 시나리오와 `boyuse.ts`의 2027/2028 시나리오는 2026년 세제개편안 정부안에 기반한 예측입니다. 이 내용은 현재법이 아니므로, 사용자에게는 `정부안`, `개편안`, `시나리오`로 표시해야 합니다.

정부안의 공식 출처는 다음과 같습니다.

- https://m.korea.kr/briefing/pressReleaseView.do?newsId=156773219&pWise=sub&pWiseSub=J1
- https://admin.korea.kr/briefing/pressReleaseView.do?newsId=156776418&pWise=mSub&pWiseSub=C3

## 질문을 생략해도 되는 기본값과, 생략하면 안 되는 사실을 구분해야 합니다.

필수 질문은 세목, 거래원인, 대상 자산, 금액, 연도, 지역, 세대 여부, 주택 수, 보유기간, 거주기간, 관계, 채무, 사전증여 여부처럼 결론을 바꾸는 사실입니다.

선택 질문은 배우자 실제 상속분, 사전증여의 세부 내역, 동거기간 증빙처럼 있으면 더 정확해지지만, 없으면 보수적으로 넘길 수 있는 사실입니다.

기본값은 혜택을 자동으로 붙이지 않는 쪽으로 잡아야 합니다. 특례와 감면은 확인되지 않으면 미적용으로 계산하고, 일반세율과 기본공제만 먼저 보여 주는 편이 안전합니다.

## 모델 가드 문구는 이렇게 고정해야 합니다.

`현행`이라는 말을 쓰기 전에 반드시 시행일이 붙은 법령정보센터 조문이나 국세청 현재 안내 페이지를 확인해야 합니다.

`정부안`, `개편안`, `2027`, `2028`, `2029`가 보이면 현재법으로 말하지 말고 시나리오로 분리해야 합니다.

법인 여부, 조정대상지역 여부, 1세대 여부, 미성년 여부, 동거주택 요건, 혼인·출산 공제 요건, 사전증여 합산 여부, 부담부증여 채무액처럼 결과를 크게 바꾸는 입력이 비면, 보수적 기본값을 쓰거나 바로 추가 질문을 해야 합니다.

조례나 지역 고시가 들어가는 항목은 전국 공통값으로 말하지 말고, 적용 지역을 받은 뒤에만 답해야 합니다.

## 공개 저장소에서 바로 쓸 한 줄 설명

이 플러그인은 부동산 세금을 자동 계산하지만, 현재법과 정부안 시뮬레이션을 분리하고 특례는 확인된 사실이 있을 때만 적용합니다.
