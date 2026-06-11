// Indian States/UTs and their districts — used to drive the cluster form's
// State dropdown and District typeahead. District lists aim for good coverage;
// the District field still accepts free text (via a <datalist>) so an
// unlisted/newly-formed district can always be entered.

export const INDIA_STATES_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool',
    'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram',
    'West Godavari', 'YSR Kadapa',
  ],
  'Arunachal Pradesh': [
    'Changlang', 'East Kameng', 'East Siang', 'Lower Subansiri', 'Papum Pare',
    'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang',
  ],
  'Assam': [
    'Barpeta', 'Cachar', 'Darrang', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat',
    'Jorhat', 'Kamrup', 'Karbi Anglong', 'Lakhimpur', 'Nagaon', 'Nalbari',
    'Sivasagar', 'Sonitpur', 'Tinsukia',
  ],
  'Bihar': [
    'Araria', 'Aurangabad', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar',
    'Darbhanga', 'Gaya', 'Gopalganj', 'Jamui', 'Katihar', 'Madhubani', 'Munger',
    'Muzaffarpur', 'Nalanda', 'Patna', 'Purnia', 'Rohtas', 'Saran', 'Sitamarhi',
    'Vaishali',
  ],
  'Chhattisgarh': [
    'Balod', 'Bastar', 'Bilaspur', 'Durg', 'Janjgir-Champa', 'Korba', 'Mahasamund',
    'Raigarh', 'Raipur', 'Rajnandgaon', 'Surguja',
  ],
  'Goa': ['North Goa', 'South Goa'],
  'Gujarat': [
    'Ahmedabad', 'Amreli', 'Anand', 'Banaskantha', 'Bharuch', 'Bhavnagar',
    'Gandhinagar', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mehsana', 'Navsari',
    'Panchmahal', 'Patan', 'Rajkot', 'Sabarkantha', 'Surat', 'Surendranagar',
    'Vadodara', 'Valsad',
  ],
  'Haryana': [
    'Ambala', 'Bhiwani', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar',
    'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Panipat',
    'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar',
  ],
  'Himachal Pradesh': [
    'Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Mandi',
    'Shimla', 'Sirmaur', 'Solan', 'Una',
  ],
  'Jharkhand': [
    'Bokaro', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Giridih',
    'Hazaribagh', 'Palamu', 'Ranchi', 'Saraikela Kharsawan', 'West Singhbhum',
  ],
  'Karnataka': [
    'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
    'Bidar', 'Chamarajanagar', 'Chikkaballapur', 'Chikkamagaluru', 'Chitradurga',
    'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan', 'Haveri',
    'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysuru', 'Raichur',
    'Ramanagara', 'Shivamogga', 'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura',
    'Yadgir',
  ],
  'Kerala': [
    'Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
    'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta',
    'Thiruvananthapuram', 'Thrissur', 'Wayanad',
  ],
  'Madhya Pradesh': [
    'Balaghat', 'Betul', 'Bhopal', 'Chhindwara', 'Dewas', 'Dhar', 'Gwalior',
    'Hoshangabad', 'Indore', 'Jabalpur', 'Khargone', 'Mandsaur', 'Morena',
    'Rewa', 'Sagar', 'Satna', 'Sehore', 'Shivpuri', 'Ujjain', 'Vidisha',
  ],
  'Maharashtra': [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
    'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Jalgaon', 'Jalna',
    'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded',
    'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad',
    'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha',
    'Washim', 'Yavatmal',
  ],
  'Manipur': [
    'Bishnupur', 'Churachandpur', 'Imphal East', 'Imphal West', 'Senapati',
    'Thoubal', 'Ukhrul',
  ],
  'Meghalaya': [
    'East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Ri Bhoi',
    'West Garo Hills', 'West Khasi Hills',
  ],
  'Mizoram': ['Aizawl', 'Champhai', 'Kolasib', 'Lunglei', 'Mamit', 'Serchhip'],
  'Nagaland': [
    'Dimapur', 'Kohima', 'Mokokchung', 'Mon', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto',
  ],
  'Odisha': [
    'Angul', 'Balasore', 'Bargarh', 'Bhadrak', 'Cuttack', 'Dhenkanal', 'Ganjam',
    'Jajpur', 'Kalahandi', 'Kendrapara', 'Keonjhar', 'Khordha', 'Koraput',
    'Mayurbhanj', 'Nayagarh', 'Puri', 'Rayagada', 'Sambalpur', 'Sundargarh',
  ],
  'Punjab': [
    'Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka',
    'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana',
    'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar',
    'Sangrur', 'Tarn Taran',
  ],
  'Rajasthan': [
    'Ajmer', 'Alwar', 'Banswara', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner',
    'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Ganganagar', 'Hanumangarh',
    'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Kota',
    'Nagaur', 'Pali', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur',
  ],
  'Sikkim': ['East Sikkim', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
  'Tamil Nadu': [
    'Ariyalur', 'Chengalpattu', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri',
    'Dindigul', 'Erode', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri',
    'Madurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai',
    'Ramanathapuram', 'Salem', 'Sivaganga', 'Thanjavur', 'Theni', 'Thoothukudi',
    'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai',
    'Vellore', 'Viluppuram', 'Virudhunagar',
  ],
  'Telangana': [
    'Adilabad', 'Hyderabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Medak',
    'Nalgonda', 'Nizamabad', 'Rangareddy', 'Warangal',
  ],
  'Tripura': ['Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
  'Uttar Pradesh': [
    'Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Azamgarh', 'Bareilly',
    'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Deoria', 'Etawah', 'Faizabad',
    'Farrukhabad', 'Fatehpur', 'Firozabad', 'Ghaziabad', 'Ghazipur', 'Gonda',
    'Gorakhpur', 'Hardoi', 'Jaunpur', 'Jhansi', 'Kanpur Nagar', 'Lakhimpur Kheri',
    'Lucknow', 'Mathura', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar',
    'Pratapgarh', 'Raebareli', 'Rampur', 'Saharanpur', 'Sitapur', 'Sultanpur',
    'Unnao', 'Varanasi',
  ],
  'Uttarakhand': [
    'Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar',
    'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal',
    'Udham Singh Nagar', 'Uttarkashi',
  ],
  'West Bengal': [
    'Bankura', 'Birbhum', 'Cooch Behar', 'Dakshin Dinajpur', 'Darjeeling', 'Hooghly',
    'Howrah', 'Jalpaiguri', 'Jhargram', 'Kolkata', 'Malda', 'Murshidabad', 'Nadia',
    'North 24 Parganas', 'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman',
    'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
  ],
  // Union Territories
  'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'South Andaman'],
  'Chandigarh': ['Chandigarh'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
  'Delhi': [
    'Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi',
    'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi',
    'South West Delhi', 'West Delhi',
  ],
  'Jammu and Kashmir': [
    'Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu',
    'Kathua', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Srinagar', 'Udhampur',
  ],
  'Ladakh': ['Kargil', 'Leh'],
  'Lakshadweep': ['Lakshadweep'],
  'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
};

export const INDIA_STATES: string[] = Object.keys(INDIA_STATES_DISTRICTS).sort();

export const districtsForState = (state: string): string[] =>
  INDIA_STATES_DISTRICTS[state] ?? [];
