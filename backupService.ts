import { Worker, AttendanceRecord, AttendanceStatus, DayRecord } from '../types';

export const INITIAL_WORKERS: Worker[] = [
  // CONTRACTING (12 Workers)
  { id: '784-1991-7191595-4', workerNumber: '101', name: 'Muhammad Jan Gul Zaman', company: 'CONTRACTING', role: 'Helper', department: 'General', monthlySalary: 2100, otRatePerHour: 2100 / 30 / 9, joiningDate: '2023-01-01', status: 'Active', assignedSites: ['Spd viila no 13', 'Jafza Jabel Ali'] },
  { id: '784-1997-6106629-1', workerNumber: '103', name: 'Jameel Lateef', company: 'CONTRACTING', role: 'Painter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active', assignedSites: ['Dubai festibel city'] },
  { id: '784-1991-5873714-0', workerNumber: '104', name: 'Natiq Hussain Akhlaq Hussain', company: 'CONTRACTING', role: 'Painter', department: 'General', monthlySalary: 1700, otRatePerHour: 1700 / 30 / 9, joiningDate: '2023-01-01', status: 'Active', assignedSites: ['Fujairah', 'Dubai Team Fujairah'] },
  { id: '784-1986-3913636-9', workerNumber: '105', name: 'Ghulam Abbas Abdul Ghafoor', company: 'CONTRACTING', role: 'Helper', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1993-1831747-8', workerNumber: '106', name: 'Mustakim Ansari Mohammad Akbar Ansari', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1993-6162068-7', workerNumber: '107', name: 'Ubaidur Raja Sujaat Ali', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 1500, otRatePerHour: 1500 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1969-9071361-0', workerNumber: '108', name: 'Mohammad Maharaj Howlader Arshed Ali Howlader', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1991-4900754-6', workerNumber: '109', name: 'MD Raju Kaji Faruk Kaji', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 1250, otRatePerHour: 1250 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1982-3927042-8', workerNumber: '110', name: 'Ala Uddin MD Ismail', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 1700, otRatePerHour: 1700 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1981-5258254-4', workerNumber: '111', name: 'Abdul Kadir Yousub Ali', company: 'CONTRACTING', role: 'Painter', department: 'General', monthlySalary: 2300, otRatePerHour: 2300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1978-2564393-1', workerNumber: '115', name: 'Hanif Khan Husain Khani Nazir Khan', company: 'CONTRACTING', role: 'Mason', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1990-4148765-5', workerNumber: '117', name: 'Ramjan Khan Fule Khan', company: 'CONTRACTING', role: 'Carpenter', department: 'General', monthlySalary: 3150, otRatePerHour: 3150 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },

  // SAMA (15 Workers)
  { id: '784-2002-5884050-1', workerNumber: '113', name: 'Dinesh Kumar Ram Bujhrat', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1996-4563604-6', workerNumber: '114', name: 'Mohammad Taveraj Ajad Jaki Ahmad', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2000-7624597-4', workerNumber: '126', name: 'Dilshad Ahmad Lallan', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1989-4862797-5', workerNumber: '127', name: 'Arjun Prasad Lalata Prasad', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1982-0964053-5', workerNumber: '157', name: 'Ali Hussain Ali Rajja', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2003-5864734-3', workerNumber: '158', name: 'Mohammad Touhid Rizvi Mumtaz Rizvi', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1250, otRatePerHour: 1250 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2004-9831123-0', workerNumber: '161', name: 'Abhishek Rattan Masih', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2002-4446903-5', workerNumber: '162', name: 'Roban Mohinder Masih', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2003-1806375-5', workerNumber: '163', name: 'MD Azad Hussain Nousad Alam', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2003-9372118-6', workerNumber: '164', name: 'Arman Hussain Mehndi Hussain', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2000-8487323-9', workerNumber: '165', name: 'Najim Bhura', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2006-8348593-0', workerNumber: '166', name: 'Sarfaraz Rizvi Mumtaz Rizvi', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1992-0319636-7', workerNumber: '168', name: 'Golam Ali Gazi Taieb Ali Gazi', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1250, otRatePerHour: 1250 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2007-7228446-7', workerNumber: '170', name: 'Priyanshu Virampal', company: 'SAMA', role: 'Painter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2001-3178542-8', workerNumber: '173', name: 'Mairaj Ali Shiraj Ali', company: 'SAMA', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },

  // CLEANING (10 Workers)
  { id: '784-1990-3443647-9', workerNumber: '118', name: 'Kishori Lal Mevalal', company: 'CLEANING', role: 'Carpenter', department: 'General', monthlySalary: 1250, otRatePerHour: 1250 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1992-9807279-6', workerNumber: '119', name: 'Munavvar Ali Abdullah', company: 'CLEANING', role: 'Carpenter', department: 'General', monthlySalary: 1550, otRatePerHour: 1550 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1975-3857939-8', workerNumber: '121', name: 'Ramesh Kumar', company: 'CLEANING', role: 'Carpenter', department: 'General', monthlySalary: 1800, otRatePerHour: 1800 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2003-9169487-2', workerNumber: '122', name: 'Taimoor Hussain Faqir Shah', company: 'CLEANING', role: 'Painter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-41993-7093095-2', workerNumber: '123', name: 'Dinesh Gupta', company: 'CLEANING', role: 'Painter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1992-3250498-7', workerNumber: '136', name: 'Asad Siraj Muhammad Siraj', company: 'CLEANING', role: 'Painter', department: 'General', monthlySalary: 1900, otRatePerHour: 1900 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1996-7682567-4', workerNumber: '137', name: 'Vijay Kumar Paswan Janak Ram Paswan', company: 'CLEANING', role: 'Carpenter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1994-9263362-6', workerNumber: '138', name: 'Vinay Lalmani', company: 'CLEANING', role: 'Carpenter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1983-1507497-5', workerNumber: '139', name: 'Sikandar Khan Manfool Khan Kayamkhani', company: 'CLEANING', role: 'Allrounder', department: 'General', monthlySalary: 3500, otRatePerHour: 3500 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2004-81074177-9', workerNumber: '140', name: 'Ayan Khan Yunush Khan', company: 'CLEANING', role: 'Painter', department: 'General', monthlySalary: 2000, otRatePerHour: 2000 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },

  // CALIPHX (7 Workers)
  { id: '784-1983-5765282-9', workerNumber: '130', name: 'Jitendra Prasad Ramdev Prasad', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-19904946402-9', workerNumber: '155', name: 'MD Enamul Haque MD Sarajul Haque', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1988-9003411-3', workerNumber: '156', name: 'Raju Verma Amerika Prasad', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1100, otRatePerHour: 1100 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-19841396482-0', workerNumber: '169', name: 'Satwindar Singh Amar Singh', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1996-8547350-8', workerNumber: '171', name: 'Jahid Hussain Abdul Vahid', company: 'CALIPHX', role: 'Painter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1984-2190254-9', workerNumber: '175', name: 'Najir Ahmad Mohammad Rajjak', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '185-CALIPHX', workerNumber: '185', name: 'Akash Kumar Sharma Sampat Sharma', company: 'CALIPHX', role: 'Carpenter', department: 'General', monthlySalary: 1350, otRatePerHour: 1350 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },

  // AAF (27 Workers)
  { id: '784-1984-9847595-7', workerNumber: '102', name: 'Qaisar Abbas', company: 'AAF', role: 'Electrician', department: 'General', monthlySalary: 1650, otRatePerHour: 1650 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1999-5753360-9', workerNumber: '141', name: 'Raja Babu Bhagelu', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1500, otRatePerHour: 1500 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1983-9000455-8', workerNumber: '142', name: 'Abu Bakar Shamsullah', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2004-7634277-7', workerNumber: '143', name: 'Shrikant Shesram', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1998-9789823-7', workerNumber: '144', name: 'Aasif Khan Husain Khan', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1988-8288713-0', workerNumber: '145', name: 'Anil Kumar Sadanand', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2003-7269270-5', workerNumber: '146', name: 'Amit Kumar Prajapati Bahadur', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2004-3355788-9', workerNumber: '147', name: 'Vishal Nan Babu', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1994-8933911-1', workerNumber: '148', name: 'Mohd Arshad Mujeebullah', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1991-1362662-8', workerNumber: '149', name: 'Zahoor Hussain Manzoor Hussain', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1995-0385214-9', workerNumber: '150', name: 'Sajid Ali Ashraf', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1600, otRatePerHour: 1600 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1989-3587462-2', workerNumber: '151', name: 'Lal Chand Nayak Gopal Nayak', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1987-9501816-1', workerNumber: '152', name: 'Najbuddin Karam Mohammad', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2001-5680150-6', workerNumber: '153', name: 'MD Soaib MD Taslim', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1997-9879078-0', workerNumber: '159', name: 'Mohammad Irshad Rizvi Mumtaz Rizvi', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1450, otRatePerHour: 1450 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1982-3807905-1', workerNumber: '160', name: 'Abid Ali Akhtar Ali', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1550, otRatePerHour: 1550 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1998-6346960-9', workerNumber: '172', name: 'Inamulla Ahmadullah', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1400, otRatePerHour: 1400 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2004-7888891-8', workerNumber: '174', name: 'MD Sagheer Ansari MD Sameer Ansari', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1989-9861850-2', workerNumber: '176', name: 'MD Saddam Aley Nabi', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2001-7913333-3', workerNumber: '177', name: 'Taj Mohammad Mo Maruf', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1992-6061845-1', workerNumber: '178', name: 'Ram Bechan Tulsi Ram', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-2000-2929700-7', workerNumber: '179', name: 'Vinod Kumar Prajapati Ghan Shyam', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1994-7363736-3', workerNumber: '181', name: 'Chandan Kumar Yadav', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1100, otRatePerHour: 1100 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1992-4958367-7', workerNumber: '182', name: 'Arman Ali Mohammad Rais', company: 'AAF', role: 'Carpenter', department: 'General', monthlySalary: 1300, otRatePerHour: 1300 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '784-1982-9047591-6', workerNumber: '183', name: 'Sher Ali Ali Hussain', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1100, otRatePerHour: 1100 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '186-AAF', workerNumber: '186', name: 'Jahid Khan Jakir Khan', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 1200, otRatePerHour: 1200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
  { id: '187-AAF', workerNumber: '187', name: 'Zeb Anwar', company: 'AAF', role: 'Painter', department: 'General', monthlySalary: 2200, otRatePerHour: 2200 / 30 / 9, joiningDate: '2023-01-01', status: 'Active' },
];

export const generateInitialAttendance = (workers: Worker[]): AttendanceRecord[] => {
  const allRecords: AttendanceRecord[] = [];
  const sites = [
    'Spd viila no 13', 
    'Jafza Jabel Ali', 
    'Fujairah', 
    'Dubai Team Fujairah', 
    'Dubai festibel city', 
    'Jebel Ali Landmarks', 
    'Jumeriah Golf Villa no. 71', 
    'OP3 Warehouse', 
    'Bur Dubai', 
    'V-19', 
    'Burj Khalifa',
    'Alqusais villa'
  ];
  const companies = ['CONTRACTING', 'SAMA', 'CLEANING', 'CALIPHX', 'AAF'];
  
  // Generate records for the last 10 days
  const today = new Date();
  for (let i = 0; i < 10; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // For each day, generate 2-4 records for different sites/companies
    const numRecordsToday = 2 + Math.floor(Math.random() * 3);
    
    for (let j = 0; j < numRecordsToday; j++) {
      const company = companies[Math.floor(Math.random() * companies.length)];
      const site = sites[Math.floor(Math.random() * sites.length)];
      
      // Find workers for this company
      const companyWorkers = workers.filter(w => w.company === company);
      if (companyWorkers.length === 0) continue;

      // Pick 3-8 random workers from this company
      const numWorkers = 3 + Math.floor(Math.random() * 6);
      const selectedWorkers = [...companyWorkers]
        .sort(() => 0.5 - Math.random())
        .slice(0, Math.min(numWorkers, companyWorkers.length));
      
      const workerIds = selectedWorkers.map(w => w.id);

      const h = 9;
      const m = workerIds.length;
      const r = 10 + Math.floor(Math.random() * 10);
      const th = h * m;
      const total = th * r;
      
      allRecords.push({
        id: `initial-record-${dateStr}-${j}`,
        date: dateStr,
        hours: h,
        mp: m,
        rate: r,
        total,
                companyName: company,
        site: site,
        workerIds: workerIds
      });
    }
  }

  return allRecords;
};
