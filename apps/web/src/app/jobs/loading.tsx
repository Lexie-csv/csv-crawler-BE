export default function Loading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#DCDCDC] border-t-[#202020] mb-4"></div>
                <p className="text-[#727272]">Loading jobs...</p>
            </div>
        </div>
    );
}
