import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const BUCKET_NAME = 'centumbob-menu-images';
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Supabase Storage 테스트 ===\n');
console.log('Supabase URL:', supabaseUrl);
console.log('Service Role Key:', supabaseKey ? '설정됨 (' + supabaseKey.substring(0, 20) + '...)' : '없음');
console.log('버킷 이름:', BUCKET_NAME);
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testStorage() {
  try {
    // 1. 버킷 존재 확인
    console.log('1. 버킷 존재 여부 확인...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

    if (bucketsError) {
      console.error('❌ 버킷 목록 조회 실패:', bucketsError.message);
      return;
    }

    const bucket = buckets.find(b => b.name === BUCKET_NAME);
    if (!bucket) {
      console.error(`❌ 버킷 "${BUCKET_NAME}"이 존재하지 않습니다.`);
      console.log('   사용 가능한 버킷:', buckets.map(b => b.name).join(', '));
      return;
    }

    console.log('✅ 버킷이 존재합니다.');
    console.log('   - Public:', bucket.public);
    console.log('   - ID:', bucket.id);
    console.log('');

    // 2. 버킷 내 파일 목록 조회
    console.log('2. 버킷 내 파일 목록 조회...');
    const { data: files, error: filesError } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (filesError) {
      console.error('❌ 파일 목록 조회 실패:', filesError.message);
      return;
    }

    if (files.length === 0) {
      console.log('⚠️  버킷에 파일이 없습니다.');
    } else {
      console.log(`✅ ${files.length}개의 파일이 있습니다.`);
      console.log('\n최근 파일 목록:');
      files.forEach((file, idx) => {
        console.log(`   ${idx + 1}. ${file.name} (${(file.metadata?.size / 1024).toFixed(1)}KB)`);
      });
    }
    console.log('');

    // 3. Public URL 생성 및 접근 테스트
    if (files.length > 0) {
      console.log('3. Public URL 접근 테스트...');
      const testFile = files[0];
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${testFile.name}`;
      console.log('   테스트 파일:', testFile.name);
      console.log('   Public URL:', publicUrl);

      // HTTP GET 요청으로 접근 테스트
      try {
        const response = await fetch(publicUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Public URL 접근 가능');
          console.log('   - Status:', response.status);
          console.log('   - Content-Type:', response.headers.get('content-type'));
        } else {
          console.error('❌ Public URL 접근 실패');
          console.error('   - Status:', response.status);
          console.error('   - Status Text:', response.statusText);

          if (response.status === 404) {
            console.log('\n⚠️  버킷이 public으로 설정되지 않았을 수 있습니다.');
            console.log('   Supabase Dashboard에서 다음을 확인하세요:');
            console.log('   Storage > centumbob-menu-images > Settings > Public bucket');
          }
        }
      } catch (fetchError) {
        console.error('❌ URL 접근 중 오류:', fetchError.message);
      }
    }

    console.log('\n=== 테스트 완료 ===');

  } catch (error) {
    console.error('❌ 테스트 중 오류 발생:', error);
  }
}

testStorage();
