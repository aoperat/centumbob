import { useState, useEffect } from 'react';
import { IconCopy, IconCheck } from './Icons';

const API_BASE_URL = '/api';

const ApiGuideTab = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/restaurants`);
        if (response.ok) {
          const data = await response.json();
          setRestaurants(data.filter(r => r.is_active));
        }
      } catch (error) {
        console.error('식당 목록 로드 실패:', error);
      }
    };
    fetchRestaurants();
  }, []);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const exampleRestaurantId = restaurants.length > 0 ? restaurants[0].id : 1;
  const exampleRestaurantName = restaurants.length > 0 ? restaurants[0].name : '예시 식당';

  const curlExample = `curl -X POST http://localhost:9101/api/menu/upload \\
  -F "image=@/path/to/menu-image.jpg" \\
  -F "restaurant_id=${exampleRestaurantId}" \\
  -F "type=전체요일"`;

  const curlExampleIndividual = `curl -X POST http://localhost:9101/api/menu/upload \\
  -F "image=@/path/to/menu-image.jpg" \\
  -F "restaurant_id=${exampleRestaurantId}" \\
  -F "type=개별요일" \\
  -F "day_id=월"`;

  const javascriptExample = `const formData = new FormData();
formData.append('image', fileInput.files[0]);
formData.append('restaurant_id', ${exampleRestaurantId});
formData.append('type', '전체요일');

fetch('http://localhost:9101/api/menu/upload', {
  method: 'POST',
  body: formData
})
  .then(response => response.json())
  .then(data => console.log('성공:', data))
  .catch(error => console.error('오류:', error));`;

  const pythonExample = `import requests

url = 'http://localhost:9101/api/menu/upload'
files = {'image': open('menu-image.jpg', 'rb')}
data = {
    'restaurant_id': ${exampleRestaurantId},
    'type': '전체요일'
}

response = requests.post(url, files=files, data=data)
print(response.json())`;

  return (
    <div className="w-full h-full p-8 overflow-y-auto custom-scrollbar fade-in bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">API 사용법 안내</h1>
          <p className="text-slate-600">
            외부에서 이미지와 메뉴 데이터를 업로드할 수 있는 API 엔드포인트 사용 방법을 안내합니다.
          </p>
        </div>

        {/* API 엔드포인트 정보 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">엔드포인트 정보</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm font-bold">POST</span>
                <code className="text-sm font-mono text-slate-800">/api/menu/upload</code>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                이미지를 업로드하고 OCR 및 GPT를 통해 메뉴 정보를 자동으로 추출하여 저장합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 요청 파라미터 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">요청 파라미터</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">파라미터</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">타입</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">필수</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">image</td>
                    <td className="px-4 py-3 text-slate-600">File</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">필수</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">식단표 이미지 파일 (JPG, PNG 등)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">restaurant_id</td>
                    <td className="px-4 py-3 text-slate-600">Integer</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">필수</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">식당 ID (기준 데이터 관리에서 확인 가능)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">type</td>
                    <td className="px-4 py-3 text-slate-600">String</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">필수</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      타입 구분: <code className="bg-slate-100 px-1 rounded">"전체요일"</code> 또는 <code className="bg-slate-100 px-1 rounded">"개별요일"</code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600">day_id</td>
                    <td className="px-4 py-3 text-slate-600">String</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">조건부</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      개별요일일 때만 필수. 값: <code className="bg-slate-100 px-1 rounded">"월"</code>, <code className="bg-slate-100 px-1 rounded">"화"</code>, <code className="bg-slate-100 px-1 rounded">"수"</code>, <code className="bg-slate-100 px-1 rounded">"목"</code>, <code className="bg-slate-100 px-1 rounded">"금"</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 식당 ID 확인 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">식당 ID 확인 방법</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-slate-600 mb-4">
              기준 데이터 관리 페이지에서 각 식당의 ID를 확인할 수 있습니다.
            </p>
            {restaurants.length > 0 ? (
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-bold text-slate-500 mb-2">등록된 식당 목록:</p>
                <div className="space-y-2">
                  {restaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center justify-between bg-white p-2 rounded border border-slate-200">
                      <span className="text-sm text-slate-700">{restaurant.name}</span>
                      <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                        ID: {restaurant.id}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">등록된 식당이 없습니다.</p>
            )}
          </div>
        </div>

        {/* 타입 구분 설명 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">타입 구분 설명</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-slate-800 mb-1">전체요일</h3>
              <p className="text-sm text-slate-600">
                한 주치 식단표 이미지를 업로드하면 모든 요일(월~금)에 동일한 메뉴가 적용됩니다.
                이미지에서 추출한 첫 번째 요일(월요일)의 메뉴가 모든 요일에 복사됩니다.
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold text-slate-800 mb-1">개별요일</h3>
              <p className="text-sm text-slate-600">
                특정 요일의 식단표 이미지만 업로드하여 해당 요일에만 메뉴를 적용합니다.
                <code className="bg-slate-100 px-1 rounded text-xs">day_id</code> 파라미터로 요일을 지정해야 합니다.
              </p>
            </div>
          </div>
        </div>

        {/* 요청 예시 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">요청 예시</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* cURL - 전체요일 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">cURL (전체요일)</h3>
                <button
                  onClick={() => copyToClipboard(curlExample, 'curl-all')}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors"
                >
                  {copiedCode === 'curl-all' ? (
                    <>
                      <IconCheck size={14} /> 복사됨
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} /> 복사
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{curlExample}</code>
              </pre>
            </div>

            {/* cURL - 개별요일 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">cURL (개별요일)</h3>
                <button
                  onClick={() => copyToClipboard(curlExampleIndividual, 'curl-individual')}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors"
                >
                  {copiedCode === 'curl-individual' ? (
                    <>
                      <IconCheck size={14} /> 복사됨
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} /> 복사
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{curlExampleIndividual}</code>
              </pre>
            </div>

            {/* JavaScript */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">JavaScript (Fetch API)</h3>
                <button
                  onClick={() => copyToClipboard(javascriptExample, 'js')}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors"
                >
                  {copiedCode === 'js' ? (
                    <>
                      <IconCheck size={14} /> 복사됨
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} /> 복사
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{javascriptExample}</code>
              </pre>
            </div>

            {/* Python */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-700">Python (requests)</h3>
                <button
                  onClick={() => copyToClipboard(pythonExample, 'python')}
                  className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors"
                >
                  {copiedCode === 'python' ? (
                    <>
                      <IconCheck size={14} /> 복사됨
                    </>
                  ) : (
                    <>
                      <IconCopy size={14} /> 복사
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{pythonExample}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* 응답 형식 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">응답 형식</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-700 mb-2">성공 응답 (200 OK)</h3>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`{
  "success": true,
  "message": "메뉴 데이터가 성공적으로 저장되었습니다.",
  "data": {
    "restaurant_id": ${exampleRestaurantId},
    "restaurant_name": "${exampleRestaurantName}",
    "date_range": "1월 12일 ~ 1월 16일",
    "type": "전체요일",
    "day_id": null,
    "image_path": "uploads/...",
    "image_paths": null,
    "menus": {
      "월": {
        "lunch": ["메뉴1", "메뉴2"],
        "dinner": ["메뉴3"]
      },
      ...
    },
    "price": {
      "lunch": "7,000원",
      "dinner": "7,000원"
    }
  }
}`}</code>
              </pre>
            </div>

            <div>
              <h3 className="font-bold text-slate-700 mb-2">에러 응답 (400/404/500)</h3>
              <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs">
                <code>{`{
  "error": "에러 메시지",
  "message": "상세 메시지"
}`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* 에러 코드 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-800">에러 코드</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">상태 코드</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-700">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">400</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">잘못된 요청 (필수 파라미터 누락, 잘못된 타입 등)</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">404</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">식당을 찾을 수 없음</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">500</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">서버 내부 오류 (OCR/GPT 분석 실패 등)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 주의사항 */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-amber-800 mb-3">⚠️ 주의사항</h2>
          <ul className="space-y-2 text-sm text-amber-700">
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>이미지 파일 크기는 최대 10MB입니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>활성화된 날짜 범위가 없으면 요청이 실패합니다. 기준 데이터 관리에서 날짜 범위를 활성화해주세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>OCR 및 GPT 분석에는 시간이 걸릴 수 있습니다 (약 10-30초).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>같은 식당과 날짜 범위에 대한 요청은 기존 데이터를 덮어씁니다.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold">•</span>
              <span>개별요일 모드에서는 지정한 요일에만 메뉴가 업데이트되고, 다른 요일의 기존 메뉴는 유지됩니다.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ApiGuideTab;


