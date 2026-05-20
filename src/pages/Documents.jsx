// import { useEffect, useState } from 'react';
// import { useDispatch, useSelector } from 'react-redux';
// import { fetchDocuments } from '../store/thunks/documentsThunk';
// import { fetchMembers } from '../store/thunks/membersThunk';
// import { FileText, Download } from 'lucide-react';

// const TYPES = ['all', 'labReport', 'soilHealthCard', 'govtSchemeDocs'];

// const TYPE_LABELS = {
//   all: 'All',
//   labReport: 'Lab Report',
//   soilHealthCard: 'Soil Health Card',
//   govtSchemeDocs: 'Govt Scheme Docs',
// };

// const TYPE_COLORS = {
//   labReport: 'bg-blue-100 text-blue-800',
//   soilHealthCard: 'bg-brand-100 text-brand-800',
//   govtSchemeDocs: 'bg-purple-100 text-purple-800',
// };

// function Documents() {
//   const dispatch = useDispatch();
//   const { documents, loading, error } = useSelector((state) => state.documents);
//   const { members } = useSelector((state) => state.members);

//   const [selectedUserId, setSelectedUserId] = useState('');
//   const [activeType, setActiveType] = useState('all');

//   useEffect(() => {
//     dispatch(fetchMembers());
//   }, [dispatch]);

//   const handleUserChange = (e) => {
//     const id = e.target.value;
//     console.log('Selected userId:', id);
//     setSelectedUserId(id);
//     setActiveType('all');
//     if (id) dispatch(fetchDocuments(id));
//   };

//   const filtered = activeType === 'all'
//     ? documents
//     : documents.filter((d) => d.document_type === activeType);

//   return (
//     <div className="space-y-6">
//       {/* Member Selector */}
//       <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
//         <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Select Member</label>
//         <select
//           value={selectedUserId}
//           onChange={handleUserChange}
//           className="flex-1 border px-3 py-2 rounded-lg text-sm"
//         >
//           <option value="">-- Choose a member --</option>
//           {members.map((m) => (
//             <option key={m._id} value={m._id}>
//               {m.firstName} {m.lastName} — {m.phone}
//             </option>
//           ))}
//         </select>
//       </div>

//       {!selectedUserId ? (
//         <div className="flex flex-col items-center justify-center h-48 text-gray-400">
//           <FileText className="w-10 h-10 mb-2" />
//           <p className="text-sm">Select a member to view their documents</p>
//         </div>
//       ) : (
//         <>
//           {/* Filter Tabs */}
//           <div className="flex gap-2 flex-wrap">
//             {TYPES.map((t) => (
//               <button
//                 key={t}
//                 onClick={() => setActiveType(t)}
//                 className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
//                   activeType === t
//                     ? 'bg-brand-600 text-white'
//                     : 'bg-white border text-gray-600 hover:bg-gray-50'
//                 }`}
//               >
//                 {TYPE_LABELS[t]}
//               </button>
//             ))}
//           </div>

//           {error && <p className="text-sm text-red-500">{error}</p>}

//           {loading ? (
//             <div className="flex items-center justify-center h-48">
//               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
//             </div>
//           ) : filtered.length === 0 ? (
//             <div className="flex flex-col items-center justify-center h-48 text-gray-400">
//               <FileText className="w-10 h-10 mb-2" />
//               <p className="text-sm">No documents found</p>
//             </div>
//           ) : (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//               {filtered.map((doc, i) => (
//                 <div key={doc._id || i} className="bg-white rounded-xl shadow-sm p-6">
//                   <div className="flex justify-between mb-4">
//                     <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center">
//                       <FileText className="w-6 h-6 text-brand-600" />
//                     </div>
//                     <span className={`px-2 py-1 text-xs rounded-full h-fit ${TYPE_COLORS[doc.document_type] || 'bg-gray-100 text-gray-800'}`}>
//                       {TYPE_LABELS[doc.document_type] || doc.document_type}
//                     </span>
//                   </div>

//                   <h3 className="text-base font-semibold truncate">{doc.fileName || doc.title || 'Untitled'}</h3>
//                   <p className="text-sm text-gray-500 truncate mt-1">
//                     {doc.userId?.firstName} {doc.userId?.lastName}
//                   </p>

//                   <div className="flex justify-between items-center mt-4">
//                     <p className="text-xs text-gray-400">
//                       {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : ''}
//                     </p>
//                     {doc.fileUrl && (
//                       <a href={doc.fileUrl} target="_blank" rel="noreferrer" title="Download">
//                         <Download className="w-4 h-4 text-brand-600" />
//                       </a>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

// export default Documents;

function Documents() {
  return null;
}

export default Documents;
