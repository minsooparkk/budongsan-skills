# 카탈로그는 문답과 계산을 함께 정의한다

각 JSON 파일은 entry 배열이다. 모든 문장과 설명은 쉬운 한국어 두괄식으로 쓴다.

```json
{
  "id": "chwideuk",
  "title": "취득세",
  "description": "집을 살 때 내는 세금과 함께 붙는 세금을 계산합니다.",
  "module": "acquisition",
  "export": "calcAcquisition",
  "mode": "estimate",
  "fields": [
    {"key":"price","type":"number","question":"취득 금액은 얼마인가요?","required":true,"unit":"원","min":1},
    {"key":"firstHome","type":"boolean","question":"처음 집을 사는 사람의 감면 요건을 확인했나요?","required":false,"default":false,"assumption":"생애최초 감면을 적용하지 않았습니다."},
    {"key":"cause","type":"enum","question":"어떤 방법으로 취득하나요?","required":true,"options":[{"value":"purchase","label":"돈을 주고 매매"}]}
  ],
  "example": {"price":500000000,"cause":"purchase"},
  "notes": ["주택 수와 감면 요건에 따라 세액이 달라집니다."]
}
```

`module`은 engine/runtime/<module>.js, `export`는 실행할 함수다. 기본은 객체 인수 하나이다. 특수 호출은 공통 실행기에 호출 처리를 추가한다. `mode`는 estimate 또는 scenario이다. `preset`은 변형 계산기의 고정 입력이다. fields에 preset 키를 중복하지 않는다.

`type`은 number, boolean, enum, string, array, object이다. enum options는 value/label 배열이다. 수치는 유한수만 받고 금액은 원, 비율은 소수(5%=0.05), 기간은 명시한 단위로 정의한다. 필요하면 min/max/integer를 둔다. nullable:true이면 명시한 null도 허용한다. array의 items는 중첩 필드 목록 또는 {type:"number",min:0} 형식이다.

필수값에는 default를 두지 않는다. 선택값에는 반드시 default와 assumption을 둔다. 기존 EMPTY_*의 예제 금액을 사용자 기본값으로 사용하지 않는다. 실제 금액·날짜·법적 분류를 임의로 채우지 않는다. 소액 비용·감면 제외·가정 시나리오 등 생략 가능한 값만 기본값으로 둔다. 한 함수의 모든 입력을 fields 또는 preset으로 표현한다. example은 전체 필수값을 포함한 유효한 예제이며 누락한 선택값은 기본값으로 동작해야 한다.

법령 기준일 같은 대화 문맥은 엔진 필드와 별도로 공통 실행기가 처리한다. 세율표의 current라는 이름만으로 최신 세법 검증을 주장하지 않는다.

`requiredWhen`과 `requiredUnless`는 조건에 해당할 때 필수이며 기본값으로 건너뛸 수 없다. `appliesWhen`은 필수·선택 여부와 별도로 질문의 적용 조건을 정한다. 비활성 필드의 default는 엔진용 자리값이므로 결과의 기본 전제 목록에 넣지 않는다. 선택을 바꾼 뒤 남은 비활성 필드의 실제 답은 삭제한 후 다시 계산한다.

`rulesKind`는 arithmetic, dated, scenario이다. dated는 2026년 밖의 `_meta.asOf`를 추가 검토로 안내한다. `guards`는 equals/min/max와 선택적 when 조건을 검사하고 범위 밖이면 needs_review를 반환한다. `comparisons`는 left/right 필드 사이의 <= 또는 >= 관계를 검사한다. `dateWindows`는 날짜의 전후 연수 범위를, `dateParts`는 별도 연·월과 실제 날짜가 같은지 검사한다.
